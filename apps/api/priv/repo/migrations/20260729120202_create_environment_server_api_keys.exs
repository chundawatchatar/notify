defmodule Api.Repo.Migrations.CreateEnvironmentServerApiKeys do
  use Ecto.Migration

  def change do
    create table(:environment_server_api_keys, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add(
        :app_environment_id,
        references(:app_environments, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add :name, :string, null: false
      add :secret_digest, :binary, null: false
      add :masked_hint, :string, null: false
      add :revoked_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:environment_server_api_keys, [:secret_digest],
             name: :environment_server_api_keys_secret_digest_index
           )

    create index(:environment_server_api_keys, [:app_environment_id])

    create index(:environment_server_api_keys, [:app_environment_id, :inserted_at])

    create constraint(:environment_server_api_keys, :environment_server_api_keys_name_length,
             check: "char_length(name) BETWEEN 1 AND 100"
           )

    create constraint(
             :environment_server_api_keys,
             :environment_server_api_keys_secret_digest_length,
             check: "octet_length(secret_digest) = 32"
           )

    create constraint(
             :environment_server_api_keys,
             :environment_server_api_keys_masked_hint_format,
             check: "masked_hint ~ '^\\.\\.\\.[A-Za-z0-9_-]{4}$'"
           )
  end
end
