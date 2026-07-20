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
      add :slug, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create constraint(:workspaces, :workspaces_name_length,
             check: "char_length(btrim(name)) BETWEEN 2 AND 100"
           )

    create unique_index(:workspaces, ["lower(slug)"], name: :workspaces_slug_lower_index)

    create constraint(:workspaces, :workspaces_slug_format,
             check:
               "char_length(slug) BETWEEN 1 AND 50 AND slug = lower(slug) AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"
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

    create table(:auth_challenges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :purpose, :string, null: false
      add :email, :string

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)

      add :token_hash, :binary, null: false
      add :expires_at, :utc_datetime, null: false
      add :verified_at, :utc_datetime
      add :consumed_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:auth_challenges, [:token_hash])
    create unique_index(:auth_challenges, [:purpose, :email])
    create unique_index(:auth_challenges, [:purpose, :user_id])
    create index(:auth_challenges, [:expires_at])
    create index(:auth_challenges, [:user_id])

    create constraint(:auth_challenges, :auth_challenges_email_normalized,
             check: "email IS NULL OR email = lower(btrim(email))"
           )

    create constraint(:auth_challenges, :auth_challenges_email_length,
             check: "email IS NULL OR char_length(email) BETWEEN 3 AND 160"
           )

    create constraint(:auth_challenges, :auth_challenges_purpose,
             check: """
             purpose IN (
               'signup_verification',
               'signup_completion',
               'password_reset_verification',
               'password_reset_completion'
             )
             """
           )

    create constraint(:auth_challenges, :auth_challenges_subject,
             check: """
             (
               purpose IN ('signup_verification', 'signup_completion') AND
               email IS NOT NULL AND
               user_id IS NULL
             ) OR (
               purpose IN ('password_reset_verification', 'password_reset_completion') AND
               email IS NULL AND
               user_id IS NOT NULL
             )
             """
           )

    create constraint(:auth_challenges, :auth_challenges_stage,
             check: """
             (
               purpose IN ('signup_verification', 'password_reset_verification') AND
               verified_at IS NULL
             ) OR (
               purpose IN ('signup_completion', 'password_reset_completion') AND
               verified_at IS NOT NULL
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
