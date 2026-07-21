defmodule Api.Workspaces.InvitationTest do
  use Api.DataCase, async: false

  alias Api.Accounts.AuthSession
  alias Api.Workspaces
  alias Api.Workspaces.{Invitation, Membership}

  test "persists only a token digest and accepts a matching confirmed user once" do
    inviter = insert(:membership)
    invited_user = insert(:user, email: "invitee@example.com")

    assert {:ok, %{invitation: invitation, token: token}} =
             Workspaces.create_invitation(inviter, %{
               email: "INVITEE@example.com",
               role: "developer"
             })

    assert invitation.email == "invitee@example.com"
    refute invitation.token_hash == token
    assert {:ok, accepted_membership} = Workspaces.accept_invitation(token, invited_user)
    assert accepted_membership.status == "active"
    assert accepted_membership.role == "developer"

    assert {:error, :invalid_or_expired_invitation} =
             Workspaces.accept_invitation(token, invited_user)

    assert Repo.get!(Invitation, invitation.id).accepted_at
  end

  test "rejects acceptance by an account with a different confirmed email" do
    inviter = insert(:membership)
    wrong_user = insert(:user, email: "other@example.com")

    assert {:ok, %{token: token}} =
             Workspaces.create_invitation(inviter, %{email: "invitee@example.com", role: "viewer"})

    assert {:error, :email_mismatch} = Workspaces.accept_invitation(token, wrong_user)
  end

  test "re-inviting a removed user reactivates the existing membership" do
    inviter = insert(:membership)
    user = insert(:user, email: "invitee@example.com")

    removed_membership =
      insert(:membership,
        user: user,
        workspace: inviter.workspace,
        role: "viewer",
        status: "removed",
        removed_at: DateTime.utc_now(:second)
      )

    assert {:ok, %{token: token}} =
             Workspaces.create_invitation(inviter, %{email: user.email, role: "developer"})

    assert {:ok, accepted_membership} = Workspaces.accept_invitation(token, user)
    assert accepted_membership.id == removed_membership.id
    assert accepted_membership.status == "active"
    assert accepted_membership.role == "developer"
    assert accepted_membership.removed_at == nil
  end

  test "removing a membership revokes its active sessions" do
    owner = insert(:membership)
    membership = insert(:membership, workspace: owner.workspace, role: "developer")
    session = insert(:auth_session, workspace_membership: membership)

    assert {:ok, %Membership{status: "removed"}} = Workspaces.remove_membership(membership)
    assert Repo.get!(AuthSession, session.id).revoked_at
  end

  test "rejects invitations from roles without invitation permission" do
    owner = insert(:membership)
    developer = insert(:membership, workspace: owner.workspace, role: "developer")

    assert {:error, :forbidden} =
             Workspaces.create_invitation(developer, %{
               email: "invitee@example.com",
               role: "viewer"
             })
  end

  test "revoking a pending invitation prevents acceptance" do
    inviter = insert(:membership)
    invited_user = insert(:user, email: "invitee@example.com")

    assert {:ok, %{invitation: invitation, token: token}} =
             Workspaces.create_invitation(inviter, %{email: invited_user.email, role: "viewer"})

    assert {:ok, revoked_invitation} = Workspaces.revoke_invitation(invitation)
    assert revoked_invitation.revoked_at

    assert {:error, :invalid_or_expired_invitation} =
             Workspaces.accept_invitation(token, invited_user)
  end

  test "invitation factory persists its shared workspace once" do
    invitation = insert(:invitation)
    membership = Repo.get!(Membership, invitation.invited_by_membership_id)

    assert membership.workspace_id == invitation.workspace_id
  end
end
