defmodule Api.Factory do
  @moduledoc false

  use ExMachina.Ecto, repo: Api.Repo

  alias Api.Accounts.{AuthSession, SignupChallenge, User}
  alias Api.Workspaces.{Membership, Workspace}

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
    %Workspace{name: Faker.Company.name()}
  end

  def membership_factory do
    %Membership{
      user: build(:user),
      workspace: build(:workspace),
      role: "owner"
    }
  end

  def auth_session_factory do
    %AuthSession{
      workspace_membership: build(:membership),
      refresh_token_hash: :crypto.hash(:sha256, :crypto.strong_rand_bytes(32)),
      expires_at: DateTime.add(DateTime.utc_now(:second), 1, :day)
    }
  end

  def signup_challenge_factory do
    {_raw_token, challenge} =
      SignupChallenge.build(sequence(:signup_challenge_email, &"signup-#{&1}@example.com"))

    challenge
  end
end
