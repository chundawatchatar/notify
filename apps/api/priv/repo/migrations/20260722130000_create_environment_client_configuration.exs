defmodule Api.Repo.Migrations.CreateEnvironmentClientConfiguration do
  use Ecto.Migration

  def change do
    create table(:environment_client_keys, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :app_environment_id,
          references(:app_environments, type: :binary_id, on_delete: :delete_all),
          null: false

      add :key, :string, null: false
      add :revoked_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:environment_client_keys, [:app_environment_id, :key],
             name: :environment_client_keys_environment_id_key_index
           )

    create index(:environment_client_keys, [:app_environment_id])

    create constraint(:environment_client_keys, :environment_client_keys_key_format,
             check: "key ~ '^nfy_pk_[A-Za-z0-9_-]{32}$'"
           )

    create table(:environment_trusted_origins, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :app_environment_id,
          references(:app_environments, type: :binary_id, on_delete: :delete_all),
          null: false

      add :origin, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:environment_trusted_origins, [:app_environment_id, :origin],
             name: :environment_trusted_origins_environment_id_origin_index
           )

    create index(:environment_trusted_origins, [:app_environment_id])

    create constraint(:environment_trusted_origins, :environment_trusted_origins_origin_format,
             check: "origin ~ '^https?://[^/?#@:*]+(:[0-9]+)?$'"
           )
  end
end
