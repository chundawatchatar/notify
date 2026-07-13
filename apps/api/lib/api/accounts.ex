defmodule Api.Accounts do
  import Ecto.Query

  alias Api.Accounts.{AccessToken, AuthSession, SignupChallenge, User, VerificationEmail}
  alias Api.Repo
  alias Api.Workspaces.{Membership, Workspace}
  alias Ecto.Multi

  @signup_challenge_replace_fields [
    :verification_token_hash,
    :verification_expires_at,
    :verified_at,
    :completion_token_hash,
    :completion_expires_at,
    :consumed_at,
    :updated_at
  ]

  def request_signup(email) when is_binary(email) do
    {raw_token, challenge} = SignupChallenge.build(email)
    changeset = SignupChallenge.changeset(challenge)

    cond do
      not changeset.valid? ->
        {:error, :challenge, changeset}

      Repo.exists?(from user in User, where: user.email == ^challenge.email) ->
        :ok

      true ->
        persist_and_deliver_challenge(changeset, challenge.email, raw_token)
    end
  end

  def request_signup(_email) do
    {_raw_token, challenge} = SignupChallenge.build("")
    {:error, :challenge, SignupChallenge.changeset(challenge)}
  end

  def resend_verification(email), do: request_signup(email)

  def confirm_email(raw_token) do
    now = DateTime.utc_now(:second)

    with {:ok, token_hash} <- SignupChallenge.token_hash(raw_token),
         {:ok, {completion_token, challenge}} <-
           Repo.transaction(fn -> verify_signup_challenge(token_hash, now) end) do
      {:ok,
       %{
         signup_token: completion_token,
         expires_in: SignupChallenge.completion_expires_in(),
         challenge: challenge
       }}
    else
      _invalid -> {:error, :invalid_or_expired_token}
    end
  end

  def complete_signup(attrs) when is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)
    now = DateTime.utc_now(:second)
    signup_token = attrs["signup_token"]

    with {:ok, token_hash} <- SignupChallenge.token_hash(signup_token) do
      Multi.new()
      |> Multi.run(:challenge, fn repo, _changes ->
        lock_signup_completion(repo, token_hash, now)
      end)
      |> Multi.insert(:user, fn %{challenge: challenge} ->
        User.signup_completion_changeset(%User{}, attrs, challenge.email, challenge.verified_at)
      end)
      |> Multi.insert(:workspace, fn _changes ->
        Workspace.changeset(%Workspace{}, %{
          name: attrs["workspace_name"]
        })
      end)
      |> Multi.insert(:membership, fn %{user: user, workspace: workspace} ->
        Membership.changeset(%Membership{}, %{
          user_id: user.id,
          workspace_id: workspace.id,
          role: "owner"
        })
      end)
      |> Multi.update(:consumed_challenge, fn %{challenge: challenge} ->
        SignupChallenge.consume_changeset(challenge, now)
      end)
      |> Repo.transaction()
      |> normalize_completion_result()
    else
      _invalid -> {:error, :invalid_or_expired_signup_token}
    end
  end

  def login(email, password, remember) when is_binary(email) and is_binary(password) do
    user = Repo.get_by(User, email: User.normalize_email(email))

    cond do
      not User.valid_password?(user, password) ->
        {:error, :invalid_credentials}

      is_nil(user.confirmed_at) ->
        {:error, :email_not_verified}

      true ->
        user
        |> owner_membership()
        |> create_session(remember)
    end
  end

  def login(_email, _password, _remember) do
    User.valid_password?(nil, nil)
    {:error, :invalid_credentials}
  end

  def verify_access_token(token) do
    now = DateTime.utc_now(:second)

    with {:ok, %{"sid" => session_id, "sub" => user_id, "wid" => workspace_id}} <-
           AccessToken.verify_access(token),
         %AuthSession{} = session <- active_session(session_id, now),
         membership = session.workspace_membership,
         true <- membership.user_id == user_id,
         true <- membership.workspace_id == workspace_id do
      {:ok,
       %{
         session: session,
         membership: membership,
         user: membership.user,
         workspace: membership.workspace
       }}
    else
      _invalid -> {:error, :invalid_access_token}
    end
  end

  def refresh_session(refresh_token) do
    now = DateTime.utc_now(:second)

    with {:ok, session_id, secret} <- AuthSession.decode(refresh_token),
         {:ok, transaction_result} <-
           Repo.transaction(fn -> rotate_refresh_token(session_id, secret, now) end),
         {:ok, session, new_refresh_token} <- transaction_result,
         {:ok, access_token} <- issue_access_token(session) do
      {:ok, auth_result(session, access_token, new_refresh_token)}
    else
      _invalid -> {:error, :invalid_refresh_token}
    end
  end

  def revoke_session(%AuthSession{} = session) do
    session
    |> AuthSession.revoke_changeset()
    |> Repo.update()

    :ok
  end

  def revoke_session_by_refresh(refresh_token) do
    with {:ok, session_id, secret} <- AuthSession.decode(refresh_token),
         %AuthSession{} = session <- Repo.get(AuthSession, session_id),
         true <- AuthSession.secret_valid?(session, secret) do
      revoke_session(session)
    else
      _invalid -> :ok
    end
  end

  defp persist_and_deliver_challenge(changeset, email, raw_token) do
    case Repo.insert(changeset,
           on_conflict: {:replace, @signup_challenge_replace_fields},
           conflict_target: :email,
           returning: true
         ) do
      {:ok, _challenge} ->
        case VerificationEmail.deliver(email, raw_token) do
          :ok -> :ok
          {:error, _reason} -> {:error, :delivery_failed}
        end

      {:error, changeset} ->
        {:error, :challenge, changeset}
    end
  end

  defp verify_signup_challenge(token_hash, now) do
    challenge =
      Repo.one(
        from challenge in SignupChallenge,
          where:
            challenge.verification_token_hash == ^token_hash and
              challenge.verification_expires_at > ^now and is_nil(challenge.verified_at) and
              is_nil(challenge.consumed_at),
          lock: "FOR UPDATE"
      )

    case challenge do
      %SignupChallenge{} ->
        {completion_token, changeset} = SignupChallenge.verify_changeset(challenge, now)
        {:ok, verified_challenge} = Repo.update(changeset)
        {completion_token, verified_challenge}

      nil ->
        Repo.rollback(:invalid_or_expired_token)
    end
  end

  defp lock_signup_completion(repo, token_hash, now) do
    case repo.one(
           from challenge in SignupChallenge,
             where:
               challenge.completion_token_hash == ^token_hash and
                 challenge.completion_expires_at > ^now and not is_nil(challenge.verified_at) and
                 is_nil(challenge.consumed_at),
             lock: "FOR UPDATE"
         ) do
      %SignupChallenge{} = challenge -> {:ok, challenge}
      nil -> {:error, :invalid_or_expired_signup_token}
    end
  end

  defp normalize_completion_result({:ok, result}), do: {:ok, result}

  defp normalize_completion_result({:error, :challenge, reason, _changes}),
    do: {:error, reason}

  defp normalize_completion_result({:error, operation, value, _changes}),
    do: {:error, operation, value}

  defp owner_membership(user) do
    Repo.one(
      from membership in Membership,
        where: membership.user_id == ^user.id and membership.role == "owner",
        order_by: [asc: membership.inserted_at],
        limit: 1,
        preload: [:user, :workspace]
    )
  end

  defp create_session(nil, _remember), do: {:error, :workspace_membership_not_found}

  defp create_session(membership, remember) do
    now = DateTime.utc_now(:second)
    {refresh_token, session} = AuthSession.build(membership, remember, now)

    transaction =
      Multi.new()
      |> Multi.insert(:session, AuthSession.changeset(session, %{}))
      |> Multi.update(:user, User.last_login_changeset(membership.user, now))
      |> Repo.transaction()

    with {:ok, %{session: session, user: user}} <- transaction,
         membership = %{membership | user: user},
         session = %{session | workspace_membership: membership},
         {:ok, access_token} <- issue_access_token(session) do
      {:ok, auth_result(session, access_token, refresh_token)}
    end
  end

  defp active_session(session_id, now) do
    Repo.one(
      from session in AuthSession,
        where:
          session.id == ^session_id and is_nil(session.revoked_at) and
            session.expires_at > ^now,
        preload: [workspace_membership: [:user, :workspace]]
    )
  end

  defp rotate_refresh_token(session_id, secret, now) do
    session =
      Repo.one(
        from session in AuthSession,
          where: session.id == ^session_id,
          lock: "FOR UPDATE",
          preload: [workspace_membership: [:user, :workspace]]
      )

    cond do
      is_nil(session) or not AuthSession.active?(session, now) ->
        {:error, :invalid_refresh_token}

      not AuthSession.secret_valid?(session, secret) ->
        {:ok, _revoked_session} = Repo.update(AuthSession.revoke_changeset(session, now))
        {:error, :invalid_refresh_token}

      true ->
        {new_refresh_token, new_secret} = AuthSession.generate_rotated_token(session)
        {:ok, updated_session} = Repo.update(AuthSession.rotate_changeset(session, new_secret))
        {:ok, updated_session, new_refresh_token}
    end
  end

  defp issue_access_token(session) do
    membership = session.workspace_membership
    AccessToken.issue(membership.user, membership.workspace, session)
  end

  defp auth_result(session, access_token, refresh_token) do
    membership = session.workspace_membership

    %{
      access_token: access_token,
      expires_in: AccessToken.expires_in(),
      refresh_token: refresh_token,
      session: session,
      membership: membership,
      user: membership.user,
      workspace: membership.workspace
    }
  end
end
