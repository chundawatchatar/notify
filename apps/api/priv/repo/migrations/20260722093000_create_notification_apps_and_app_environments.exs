defmodule Api.Repo.Migrations.CreateNotificationAppsAndAppEnvironments do
  use Ecto.Migration

  def change do
    create table(:notification_apps, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workspace_id, references(:workspaces, type: :binary_id, on_delete: :delete_all),
        null: false

      add :name, :string, null: false
      add :app_slug, :string, null: false
      add :archived_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:notification_apps, [:workspace_id, :app_slug],
             name: :notification_apps_workspace_id_app_slug_index
           )

    create index(:notification_apps, [:workspace_id])

    create constraint(:notification_apps, :notification_apps_name_length,
             check: "char_length(btrim(name)) BETWEEN 1 AND 100"
           )

    create constraint(:notification_apps, :notification_apps_app_slug_format,
             check:
               "char_length(app_slug) BETWEEN 1 AND 50 AND app_slug = lower(app_slug) AND app_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"
           )

    create table(:app_environments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :notification_app_id,
          references(:notification_apps, type: :binary_id, on_delete: :delete_all),
          null: false

      add :name, :string, null: false
      add :environment_slug, :string, null: false
      add :production, :boolean, null: false, default: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:app_environments, [:notification_app_id, :environment_slug],
             name: :app_environments_notification_app_id_environment_slug_index
           )

    create unique_index(:app_environments, [:notification_app_id],
             where: "production",
             name: :app_environments_one_production_per_notification_app_index
           )

    create index(:app_environments, [:notification_app_id])

    create constraint(:app_environments, :app_environments_name_length,
             check: "char_length(btrim(name)) BETWEEN 1 AND 100"
           )

    create constraint(:app_environments, :app_environments_environment_slug_format,
             check:
               "char_length(environment_slug) BETWEEN 1 AND 50 AND environment_slug = lower(environment_slug) AND environment_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"
           )
  end
end
