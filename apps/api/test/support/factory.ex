defmodule Api.Factory do
  @moduledoc false

  use ExMachina.Ecto, repo: Api.Repo

  alias Api.Accounts.{AuthChallenge, AuthSession, User}
  alias Api.Workspaces.{AuditEvent, Invitation, Membership, Workspace}

  def user_factory do
    %User{
      email: sequence(:user_email, &"user-#{&1}@example.com"),
      hashed_password: Argon2.hash_pwd_salt("correct-password"),
      confirmed_at: DateTime.utc_now(:second),
      terms_version: "v1",
      terms_accepted_at: DateTime.utc_now(:second)
    }
  end

  def workspace_factory do
    slug = sequence(:workspace_slug, &"workspace-#{&1}")
    %Workspace{name: Faker.Company.name(), slug: slug}
  end

  def membership_factory do
    %Membership{
      user: build(:user),
      workspace: build(:workspace),
      role: "owner",
      status: "active",
      joined_at: DateTime.utc_now(:second)
    }
  end

  def auth_session_factory do
    %AuthSession{
      workspace_membership: build(:membership),
      refresh_token_hash: :crypto.hash(:sha256, :crypto.strong_rand_bytes(32)),
      expires_at: DateTime.add(DateTime.utc_now(:second), 1, :day)
    }
  end

  def auth_challenge_factory do
    {_raw_token, challenge} =
      AuthChallenge.build_signup_verification(
        sequence(:auth_challenge_email, &"signup-#{&1}@example.com")
      )

    challenge
  end

  def invitation_factory do
    workspace = insert(:workspace)
    membership = build(:membership, workspace: workspace)

    %Invitation{
      email: sequence(:invitation_email, &"invitee-#{&1}@example.com"),
      expires_at: DateTime.add(DateTime.utc_now(:second), 7, :day),
      invited_by_membership: membership,
      role: "developer",
      token_hash: :crypto.hash(:sha256, :crypto.strong_rand_bytes(32)),
      workspace: workspace
    }
  end

  def audit_event_factory do
    membership = build(:membership)

    %AuditEvent{
      workspace: membership.workspace,
      actor_workspace_membership: membership,
      action: "membership_role_changed",
      target_type: "workspace_membership",
      target_id: Ecto.UUID.generate(),
      metadata: %{"role" => "developer"}
    }
  end
end
