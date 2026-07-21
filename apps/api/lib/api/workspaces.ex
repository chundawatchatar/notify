defmodule Api.Workspaces do
  @moduledoc """
  Workspace membership persistence and owner-sensitive transactions.
  """

  import Ecto.Query

  alias Api.Accounts.{AuthSession, User}
  alias Api.Repo
  alias Api.Workspaces.{AuditEvent, Invitation, Membership, OwnerProtection, Workspace}
  alias Domain.WorkspacePermissions
  alias Ecto.Multi

  def list_members(workspace_id) do
    Repo.all(
      from membership in Membership,
        join: user in assoc(membership, :user),
        where: membership.workspace_id == ^workspace_id and membership.status == "active",
        order_by: [asc: user.email, asc: membership.id],
        preload: [user: user]
    )
  end

  def list_pending_invitations(workspace_id) do
    now = DateTime.utc_now(:second)

    Repo.all(
      from invitation in Invitation,
        where:
          invitation.workspace_id == ^workspace_id and is_nil(invitation.accepted_at) and
            is_nil(invitation.revoked_at) and invitation.expires_at > ^now,
        order_by: [asc: invitation.inserted_at, asc: invitation.id]
    )
  end

  def get_active_membership(workspace_id, membership_id) do
    with {:ok, membership_id} <- Ecto.UUID.cast(membership_id) do
      Repo.one(
        from membership in Membership,
          where:
            membership.id == ^membership_id and membership.workspace_id == ^workspace_id and
              membership.status == "active"
      )
    else
      :error -> nil
    end
  end

  def get_unaccepted_invitation(workspace_id, invitation_id) do
    with {:ok, invitation_id} <- Ecto.UUID.cast(invitation_id) do
      Repo.one(
        from invitation in Invitation,
          where:
            invitation.id == ^invitation_id and invitation.workspace_id == ^workspace_id and
              is_nil(invitation.accepted_at)
      )
    else
      :error -> nil
    end
  end

  @doc """
  Changes a membership role without allowing the final owner to be demoted.
  """
  def update_membership_role(%Membership{} = membership, role),
    do: update_membership_role(membership, membership, role)

  def update_membership_role(
        %Membership{id: actor_id},
        %Membership{id: membership_id, workspace_id: workspace_id},
        role
      ) do
    Multi.new()
    |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, workspace_id) end)
    |> Multi.run(:actor, fn repo, _changes ->
      lock_active_membership(repo, actor_id, workspace_id, :forbidden)
    end)
    |> Multi.run(:membership, fn repo, _changes ->
      lock_active_membership(repo, membership_id, workspace_id, :membership_not_found)
    end)
    |> Multi.run(:permission, fn _repo, %{actor: actor, membership: membership} ->
      authorize_member_management(actor, membership, role)
    end)
    |> Multi.run(:owner_protection, fn repo, %{membership: membership} ->
      OwnerProtection.ensure_owner_retained(repo, membership, role)
    end)
    |> Multi.update(:updated_membership, fn %{membership: membership} ->
      Membership.role_changeset(membership, role)
    end)
    |> Multi.insert(:membership_role_changed_audit, fn %{actor: actor, membership: membership} ->
      audit_changeset(
        actor.workspace_id,
        actor.id,
        "membership_role_changed",
        "workspace_membership",
        membership.id,
        %{
          "previous_role" => membership.role,
          "role" => role
        }
      )
    end)
    |> Multi.run(:owner_changed_audit, fn repo, %{actor: actor, membership: membership} ->
      if membership.role == "owner" or role == "owner" do
        repo.insert(
          audit_changeset(
            actor.workspace_id,
            actor.id,
            "workspace_owner_changed",
            "workspace_membership",
            membership.id,
            %{
              "previous_role" => membership.role,
              "role" => role
            }
          )
        )
      else
        {:ok, nil}
      end
    end)
    |> Repo.transaction()
    |> normalize_membership_result(:updated_membership)
  end

  @doc """
  Removes a membership without allowing the final owner to be removed.
  """
  def remove_membership(%Membership{} = membership),
    do: remove_membership(membership, membership)

  def remove_membership(
        %Membership{id: actor_id},
        %Membership{id: membership_id, workspace_id: workspace_id}
      ) do
    now = DateTime.utc_now(:second)

    Multi.new()
    |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, workspace_id) end)
    |> Multi.run(:actor, fn repo, _changes ->
      lock_active_membership(repo, actor_id, workspace_id, :forbidden)
    end)
    |> Multi.run(:membership, fn repo, _changes ->
      lock_active_membership(repo, membership_id, workspace_id, :membership_not_found)
    end)
    |> Multi.run(:permission, fn _repo, %{actor: actor, membership: membership} ->
      authorize_member_management(actor, membership, nil)
    end)
    |> Multi.run(:owner_protection, fn repo, %{membership: membership} ->
      OwnerProtection.ensure_owner_retained(repo, membership, nil)
    end)
    |> Multi.update(:removed_membership, fn %{membership: membership} ->
      Membership.removal_changeset(membership, now)
    end)
    |> Multi.run(:revoked_sessions, fn repo, %{membership: membership} ->
      revoke_membership_sessions(repo, membership.id, now)
    end)
    |> Multi.insert(:membership_removed_audit, fn %{actor: actor, membership: membership} ->
      audit_changeset(
        actor.workspace_id,
        actor.id,
        "membership_removed",
        "workspace_membership",
        membership.id,
        %{
          "role" => membership.role
        }
      )
    end)
    |> Repo.transaction()
    |> normalize_membership_result(:removed_membership)
  end

  def create_invitation(%Membership{} = inviter, attrs) when is_map(attrs) do
    now = DateTime.utc_now(:second)
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    with email when is_binary(email) <- attrs["email"],
         role when is_binary(role) <- attrs["role"] do
      normalized_email = User.normalize_email(email)

      Multi.new()
      |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, inviter.workspace_id) end)
      |> Multi.run(:inviter, fn repo, _changes ->
        lock_active_membership(repo, inviter.id, inviter.workspace_id, :inviter_not_active)
      end)
      |> Multi.run(:permission, fn _repo, %{inviter: current_inviter} ->
        if WorkspacePermissions.grantable_role?(current_inviter.role, role),
          do: {:ok, :granted},
          else: {:error, :forbidden}
      end)
      |> Multi.run(:active_membership, fn repo, %{inviter: current_inviter} ->
        if active_membership_email?(repo, current_inviter.workspace_id, normalized_email),
          do: {:error, :already_active_member},
          else: {:ok, :none}
      end)
      |> Multi.run(:revoked_pending_invitations, fn repo, %{inviter: current_inviter} ->
        revoke_pending_invitation(repo, current_inviter.workspace_id, normalized_email, now)
      end)
      |> Multi.merge(fn %{
                          inviter: current_inviter,
                          revoked_pending_invitations: invitations
                        } ->
        Enum.reduce(invitations, Multi.new(), fn invitation, multi ->
          Multi.insert(
            multi,
            {:superseded_invitation_revoked_audit, invitation.id},
            audit_changeset(
              current_inviter.workspace_id,
              current_inviter.id,
              "invitation_revoked",
              "workspace_invitation",
              invitation.id,
              %{"email" => invitation.email, "role" => invitation.role}
            )
          )
        end)
      end)
      |> Multi.run(:invitation_token, fn _repo, %{inviter: current_inviter} ->
        {token, invitation_changeset} =
          Invitation.build(
            %{
              email: normalized_email,
              invited_by_membership_id: current_inviter.id,
              role: role,
              workspace_id: current_inviter.workspace_id
            },
            now
          )

        {:ok, {token, invitation_changeset}}
      end)
      |> Multi.insert(:invitation, fn %{invitation_token: {_token, invitation_changeset}} ->
        invitation_changeset
      end)
      |> Multi.insert(:invitation_created_audit, fn %{
                                                      inviter: current_inviter,
                                                      invitation: invitation
                                                    } ->
        audit_changeset(
          current_inviter.workspace_id,
          current_inviter.id,
          "invitation_created",
          "workspace_invitation",
          invitation.id,
          %{"email" => invitation.email, "role" => invitation.role}
        )
      end)
      |> Repo.transaction()
      |> normalize_invitation_creation()
    else
      _invalid -> {:error, :invalid_invitation}
    end
  end

  def create_invitation(_, _), do: {:error, :invalid_invitation}

  def revoke_invitation(%Invitation{} = invitation), do: revoke_invitation(invitation, nil)

  def revoke_invitation(
        %Invitation{id: invitation_id, workspace_id: workspace_id},
        actor_membership_id
      ) do
    now = DateTime.utc_now(:second)

    Multi.new()
    |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, workspace_id) end)
    |> Multi.run(:invitation, fn repo, _changes -> lock_invitation(repo, invitation_id) end)
    |> Multi.update(:revoked_invitation, fn %{invitation: invitation} ->
      Invitation.revoke_changeset(invitation, now)
    end)
    |> Multi.insert(:invitation_revoked_audit, fn %{invitation: invitation} ->
      audit_changeset(
        workspace_id,
        actor_membership_id,
        "invitation_revoked",
        "workspace_invitation",
        invitation.id,
        %{"email" => invitation.email, "role" => invitation.role}
      )
    end)
    |> Repo.transaction()
    |> normalize_invitation_result(:revoked_invitation)
  end

  def validate_invitation(token) do
    now = DateTime.utc_now(:second)

    with {:ok, invitation_id, secret} <- Invitation.decode(token),
         %Invitation{} = invitation <- Repo.get(Invitation, invitation_id),
         true <- Invitation.active?(invitation, now),
         true <- Invitation.valid_secret?(invitation, secret) do
      {:ok, invitation}
    else
      _invalid -> {:error, :invalid_or_expired_invitation}
    end
  end

  def accept_invitation(token, %User{} = user) do
    now = DateTime.utc_now(:second)

    with {:ok, invitation_id, secret} <- Invitation.decode(token) do
      Multi.new()
      |> Multi.run(:invitation_lookup, fn repo, _changes ->
        find_invitation(repo, invitation_id)
      end)
      |> Multi.run(:workspace, fn repo, %{invitation_lookup: invitation} ->
        lock_workspace(repo, invitation.workspace_id)
      end)
      |> Multi.run(:invitation, fn repo, _changes ->
        lock_active_invitation(repo, invitation_id, secret, now)
      end)
      |> Multi.run(:email_match, fn _repo, %{invitation: invitation} ->
        if user.confirmed_at && user.email == invitation.email,
          do: {:ok, :matched},
          else: {:error, :email_mismatch}
      end)
      |> Multi.run(:membership, fn repo, %{invitation: invitation} ->
        lock_user_membership(repo, user.id, invitation.workspace_id)
      end)
      |> Multi.run(:active_membership, fn _repo, %{membership: membership} ->
        if membership && membership.status == "active",
          do: {:error, :already_active_member},
          else: {:ok, membership}
      end)
      |> Multi.insert_or_update(:accepted_membership, fn %{
                                                           invitation: invitation,
                                                           membership: membership
                                                         } ->
        if membership do
          Membership.reactivation_changeset(membership, invitation.role, now)
        else
          Membership.changeset(%Membership{}, %{
            user_id: user.id,
            workspace_id: invitation.workspace_id,
            role: invitation.role,
            status: "active",
            joined_at: now
          })
        end
      end)
      |> Multi.update(:accepted_invitation, fn %{invitation: invitation} ->
        Invitation.accept_changeset(invitation, now)
      end)
      |> Multi.insert(:invitation_accepted_audit, fn %{
                                                       invitation: invitation,
                                                       accepted_membership: membership
                                                     } ->
        audit_changeset(
          invitation.workspace_id,
          membership.id,
          "invitation_accepted",
          "workspace_invitation",
          invitation.id,
          %{"membership_id" => membership.id, "role" => membership.role}
        )
      end)
      |> Multi.run(:membership_reactivated_audit, fn repo,
                                                     %{
                                                       membership: previous_membership,
                                                       accepted_membership: membership
                                                     } ->
        if previous_membership do
          repo.insert(
            audit_changeset(
              membership.workspace_id,
              membership.id,
              "membership_reactivated",
              "workspace_membership",
              membership.id,
              %{"role" => membership.role}
            )
          )
        else
          {:ok, nil}
        end
      end)
      |> Repo.transaction()
      |> normalize_invitation_result(:accepted_membership)
    else
      _invalid -> {:error, :invalid_or_expired_invitation}
    end
  end

  def accept_invitation(_, _), do: {:error, :invalid_or_expired_invitation}

  def complete_invitation_signup(token, attrs) when is_map(attrs) do
    now = DateTime.utc_now(:second)
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    with {:ok, invitation_id, secret} <- Invitation.decode(token) do
      Multi.new()
      |> Multi.run(:invitation_lookup, fn repo, _changes ->
        find_invitation(repo, invitation_id)
      end)
      |> Multi.run(:workspace, fn repo, %{invitation_lookup: invitation} ->
        lock_workspace(repo, invitation.workspace_id)
      end)
      |> Multi.run(:invitation, fn repo, _changes ->
        lock_active_invitation(repo, invitation_id, secret, now)
      end)
      |> Multi.insert(:user, fn %{invitation: invitation} ->
        User.invitation_signup_changeset(%User{}, attrs, invitation.email, now)
      end)
      |> Multi.insert(:membership, fn %{invitation: invitation, user: user} ->
        Membership.changeset(%Membership{}, %{
          user_id: user.id,
          workspace_id: invitation.workspace_id,
          role: invitation.role,
          status: "active",
          joined_at: now
        })
      end)
      |> Multi.run(:session_token, fn _repo, %{membership: membership} ->
        {refresh_token, session} = AuthSession.build(membership, false, now)
        {:ok, {refresh_token, session}}
      end)
      |> Multi.insert(:session, fn %{session_token: {_refresh_token, session}} ->
        AuthSession.changeset(session, %{})
      end)
      |> Multi.update(:accepted_invitation, fn %{invitation: invitation} ->
        Invitation.accept_changeset(invitation, now)
      end)
      |> Multi.insert(:invitation_accepted_audit, fn %{
                                                       invitation: invitation,
                                                       membership: membership
                                                     } ->
        audit_changeset(
          invitation.workspace_id,
          membership.id,
          "invitation_accepted",
          "workspace_invitation",
          invitation.id,
          %{"membership_id" => membership.id, "role" => membership.role}
        )
      end)
      |> Repo.transaction()
      |> normalize_invitation_signup_result()
    else
      _invalid -> {:error, :invalid_or_expired_invitation}
    end
  end

  def complete_invitation_signup(_, _), do: {:error, :invalid_or_expired_invitation}

  defp lock_user_membership(repo, user_id, workspace_id) do
    {:ok,
     repo.one(
       from membership in Membership,
         where: membership.user_id == ^user_id and membership.workspace_id == ^workspace_id,
         lock: "FOR UPDATE"
     )}
  end

  defp lock_active_membership(repo, membership_id, workspace_id, not_found_reason) do
    case repo.one(
           from membership in Membership,
             where:
               membership.id == ^membership_id and membership.workspace_id == ^workspace_id and
                 membership.status == "active",
             lock: "FOR UPDATE"
         ) do
      %Membership{} = membership -> {:ok, membership}
      nil -> {:error, not_found_reason}
    end
  end

  defp authorize_member_management(actor, membership, new_role) do
    manages_members? = WorkspacePermissions.allowed?(actor.role, :manage_members)

    manages_owners? =
      (membership.role != "owner" and new_role != "owner") or
        WorkspacePermissions.allowed?(actor.role, :manage_owners)

    if manages_members? and manages_owners?, do: {:ok, :authorized}, else: {:error, :forbidden}
  end

  defp lock_invitation(repo, invitation_id) do
    case repo.one(
           from invitation in Invitation,
             where: invitation.id == ^invitation_id,
             lock: "FOR UPDATE"
         ) do
      %Invitation{} = invitation -> {:ok, invitation}
      nil -> {:error, :invitation_not_found}
    end
  end

  defp find_invitation(repo, invitation_id) do
    case repo.get(Invitation, invitation_id) do
      %Invitation{} = invitation -> {:ok, invitation}
      nil -> {:error, :invalid_or_expired_invitation}
    end
  end

  defp lock_active_invitation(repo, invitation_id, secret, now) do
    case repo.one(
           from invitation in Invitation,
             where: invitation.id == ^invitation_id,
             lock: "FOR UPDATE"
         ) do
      %Invitation{} = invitation ->
        if Invitation.active?(invitation, now) and Invitation.valid_secret?(invitation, secret) do
          {:ok, invitation}
        else
          {:error, :invalid_or_expired_invitation}
        end

      _invalid ->
        {:error, :invalid_or_expired_invitation}
    end
  end

  defp lock_workspace(repo, workspace_id) do
    case repo.one(
           from workspace in Workspace,
             where: workspace.id == ^workspace_id,
             lock: "FOR UPDATE"
         ) do
      %Workspace{} = workspace -> {:ok, workspace}
      nil -> {:error, :workspace_not_found}
    end
  end

  defp active_membership_email?(repo, workspace_id, email) do
    repo.exists?(
      from membership in Membership,
        join: user in User,
        on: user.id == membership.user_id,
        where:
          membership.workspace_id == ^workspace_id and membership.status == "active" and
            user.email == ^email
    )
  end

  defp revoke_pending_invitation(repo, workspace_id, email, now) do
    invitations =
      repo.all(
        from invitation in Invitation,
          where:
            invitation.workspace_id == ^workspace_id and invitation.email == ^email and
              is_nil(invitation.accepted_at) and is_nil(invitation.revoked_at),
          lock: "FOR UPDATE"
      )

    Enum.reduce_while(invitations, {:ok, invitations}, fn invitation, {:ok, _invitations} ->
      case repo.update(Invitation.revoke_changeset(invitation, now)) do
        {:ok, _revoked_invitation} -> {:cont, {:ok, invitations}}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
    end)
  end

  defp revoke_membership_sessions(repo, membership_id, now) do
    {count, _} =
      repo.update_all(
        from(session in AuthSession,
          where: session.workspace_membership_id == ^membership_id and is_nil(session.revoked_at)
        ),
        set: [revoked_at: now, updated_at: now]
      )

    {:ok, count}
  end

  defp audit_changeset(
         workspace_id,
         actor_membership_id,
         action,
         target_type,
         target_id,
         metadata
       ) do
    AuditEvent.changeset(%AuditEvent{}, %{
      workspace_id: workspace_id,
      actor_workspace_membership_id: actor_membership_id,
      action: action,
      target_type: target_type,
      target_id: target_id,
      metadata: metadata
    })
  end

  defp normalize_membership_result({:ok, result}, result_key),
    do: {:ok, Map.fetch!(result, result_key)}

  defp normalize_membership_result({:error, :owner_protection, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, :membership, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, :workspace, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, _operation, value, _changes}, _result_key),
    do: {:error, value}

  defp normalize_invitation_signup_result({:ok, result}) do
    {refresh_token, _session} = result.session_token
    {:ok, Map.put(result, :refresh_token, refresh_token)}
  end

  defp normalize_invitation_signup_result({:error, :invitation_lookup, _reason, _changes}),
    do: {:error, :invalid_or_expired_invitation}

  defp normalize_invitation_signup_result({:error, :invitation, _reason, _changes}),
    do: {:error, :invalid_or_expired_invitation}

  defp normalize_invitation_signup_result({:error, :workspace, _reason, _changes}),
    do: {:error, :invalid_or_expired_invitation}

  defp normalize_invitation_signup_result({:error, operation, reason, _changes}),
    do: {:error, operation, reason}

  defp normalize_invitation_creation(
         {:ok, %{invitation: invitation, invitation_token: {token, _}}}
       ),
       do: {:ok, %{invitation: invitation, token: token}}

  defp normalize_invitation_creation({:error, _operation, reason, _changes}), do: {:error, reason}

  defp normalize_invitation_result({:ok, result}, result_key),
    do: {:ok, Map.fetch!(result, result_key)}

  defp normalize_invitation_result({:error, _operation, reason, _changes}, _result_key),
    do: {:error, reason}
end
