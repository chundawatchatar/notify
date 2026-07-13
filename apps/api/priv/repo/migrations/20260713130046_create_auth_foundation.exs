defmodule Api.Repo.Migrations.CreateAuthFoundation do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :hashed_password, :string, null: false
      add :confirmed_at, :utc_datetime
      add :terms_version, :string, null: false
      add :terms_accepted_at, :utc_datetime, null: false
      add :last_login_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:users, [:email])

    create constraint(:users, :users_email_normalized, check: "email = lower(btrim(email))")

    create constraint(:users, :users_email_length, check: "char_length(email) BETWEEN 3 AND 160")

    create table(:workspaces, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:workspaces, :workspaces_name_length,
             check: "char_length(btrim(name)) BETWEEN 2 AND 100"
           )

    create table(:workspace_memberships, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :workspace_id, references(:workspaces, type: :binary_id, on_delete: :delete_all),
        null: false

      add :role, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:workspace_memberships, [:user_id, :workspace_id])
    create index(:workspace_memberships, [:workspace_id])

    create constraint(:workspace_memberships, :workspace_memberships_role,
             check: "role IN ('owner')"
           )

    create table(:signup_challenges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :verification_token_hash, :binary
      add :verification_expires_at, :utc_datetime
      add :verified_at, :utc_datetime
      add :completion_token_hash, :binary
      add :completion_expires_at, :utc_datetime
      add :consumed_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:signup_challenges, [:email])
    create unique_index(:signup_challenges, [:verification_token_hash])
    create unique_index(:signup_challenges, [:completion_token_hash])
    create index(:signup_challenges, [:verification_expires_at])
    create index(:signup_challenges, [:completion_expires_at])

    create constraint(:signup_challenges, :signup_challenges_email_normalized,
             check: "email = lower(btrim(email))"
           )

    create constraint(:signup_challenges, :signup_challenges_email_length,
             check: "char_length(email) BETWEEN 3 AND 160"
           )

    create constraint(:signup_challenges, :signup_challenges_state,
             check: """
             (
               verification_token_hash IS NOT NULL AND
               verification_expires_at IS NOT NULL AND
               verified_at IS NULL AND
               completion_token_hash IS NULL AND
               completion_expires_at IS NULL AND
               consumed_at IS NULL
             ) OR (
               verification_token_hash IS NULL AND
               verification_expires_at IS NULL AND
               verified_at IS NOT NULL AND
               completion_token_hash IS NOT NULL AND
               completion_expires_at IS NOT NULL AND
               consumed_at IS NULL
             ) OR (
               verification_token_hash IS NULL AND
               verification_expires_at IS NULL AND
               verified_at IS NOT NULL AND
               completion_token_hash IS NULL AND
               completion_expires_at IS NULL AND
               consumed_at IS NOT NULL
             )
             """
           )

    create table(:auth_sessions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workspace_membership_id,
          references(:workspace_memberships, type: :binary_id, on_delete: :delete_all),
          null: false

      add :refresh_token_hash, :binary, null: false
      add :expires_at, :utc_datetime, null: false
      add :revoked_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:auth_sessions, [:refresh_token_hash])
    create index(:auth_sessions, [:workspace_membership_id])
    create index(:auth_sessions, [:expires_at])
  end
end
