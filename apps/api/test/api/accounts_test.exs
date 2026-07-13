defmodule Api.AccountsTest do
  use Api.DataCase, async: false

  alias Api.Accounts
  alias Api.Accounts.{SignupChallenge, User}
  alias Api.Workspaces.{Membership, Workspace}

  defmodule FailingEmailAdapter do
    @behaviour Api.Accounts.VerificationEmail

    @impl true
    def deliver(_email, _url), do: {:error, :delivery_failed}
  end

  @email " Owner@Example.COM "
  @completion_attrs %{
    "accept_terms" => true,
    "password" => "correct-password",
    "workspace_name" => "Acme Cloud"
  }

  test "email-first signup creates the confirmed owner and workspace atomically" do
    assert :ok = Accounts.request_signup(@email)
    assert_receive {:verification_email, "owner@example.com", verification_url}
    assert Repo.aggregate(User, :count) == 0

    challenge = Repo.one!(SignupChallenge)
    raw_verification_token = token_from_url(verification_url)

    assert challenge.email == "owner@example.com"
    refute challenge.verification_token_hash == raw_verification_token

    assert {:ok, confirmation} = Accounts.confirm_email(raw_verification_token)

    assert {:ok, result} =
             Accounts.complete_signup(
               Map.put(@completion_attrs, "signup_token", confirmation.signup_token)
             )

    user = Repo.get!(User, result.user.id)
    workspace = Repo.get!(Workspace, result.workspace.id)
    membership = Repo.get!(Membership, result.membership.id)
    consumed_challenge = Repo.get!(SignupChallenge, challenge.id)

    assert user.email == "owner@example.com"
    assert user.confirmed_at
    assert user.terms_version == "v1"
    assert user.hashed_password != @completion_attrs["password"]
    assert workspace.name == "Acme Cloud"
    assert membership.role == "owner"
    assert membership.user_id == user.id
    assert membership.workspace_id == workspace.id
    assert consumed_challenge.consumed_at
    assert consumed_challenge.completion_token_hash == nil
  end

  test "signup completion validates password and terms and rolls back an invalid workspace" do
    signup_token = verified_signup_token()

    assert {:error, :user, changeset} =
             Accounts.complete_signup(
               Map.merge(@completion_attrs, %{
                 "signup_token" => signup_token,
                 "password" => "short",
                 "accept_terms" => false
               })
             )

    assert "should be at least 8 character(s)" in errors_on(changeset).password
    assert "must be accepted" in errors_on(changeset).accept_terms

    assert {:error, :workspace, _changeset} =
             Accounts.complete_signup(
               Map.merge(@completion_attrs, %{
                 "signup_token" => signup_token,
                 "workspace_name" => "x"
               })
             )

    assert Repo.aggregate(User, :count) == 0
    assert Repo.aggregate(Workspace, :count) == 0
    assert Repo.one!(SignupChallenge).consumed_at == nil
  end

  test "resending verification invalidates the previous token" do
    assert :ok = Accounts.request_signup(@email)
    assert_receive {:verification_email, _, first_url}
    first_token = token_from_url(first_url)

    assert :ok = Accounts.resend_verification("OWNER@example.com")
    assert_receive {:verification_email, _, second_url}
    second_token = token_from_url(second_url)

    refute first_token == second_token
    assert Repo.aggregate(SignupChallenge, :count) == 1
    assert {:error, :invalid_or_expired_token} = Accounts.confirm_email(first_token)
    assert {:ok, _confirmation} = Accounts.confirm_email(second_token)
  end

  test "a delivery failure leaves the signup challenge recoverable through resend" do
    previous_adapter = Application.fetch_env!(:api, :verification_email_adapter)
    Application.put_env(:api, :verification_email_adapter, FailingEmailAdapter)

    on_exit(fn -> Application.put_env(:api, :verification_email_adapter, previous_adapter) end)

    assert {:error, :delivery_failed} = Accounts.request_signup(@email)
    assert Repo.get_by!(SignupChallenge, email: "owner@example.com")
    assert Repo.aggregate(User, :count) == 0

    Application.put_env(
      :api,
      :verification_email_adapter,
      Api.Accounts.VerificationEmail.TestAdapter
    )

    assert :ok = Accounts.resend_verification("owner@example.com")
    assert_receive {:verification_email, "owner@example.com", _url}
  end

  test "requesting signup for an existing account has the same success result" do
    insert(:user, email: "owner@example.com")

    assert :ok = Accounts.request_signup(@email)
    refute_receive {:verification_email, _, _}
    assert Repo.aggregate(SignupChallenge, :count) == 0
  end

  defp verified_signup_token do
    assert :ok = Accounts.request_signup(@email)
    assert_receive {:verification_email, _, verification_url}
    assert {:ok, confirmation} = Accounts.confirm_email(token_from_url(verification_url))
    confirmation.signup_token
  end

  defp token_from_url(url) do
    url
    |> URI.parse()
    |> Map.fetch!(:query)
    |> URI.decode_query()
    |> Map.fetch!("token")
  end
end
