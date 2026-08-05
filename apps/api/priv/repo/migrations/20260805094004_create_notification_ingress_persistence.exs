defmodule Api.Repo.Migrations.CreateNotificationIngressPersistence do
  use Ecto.Migration

  def change do
    create table(:notification_events, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workspace_id, references(:workspaces, type: :binary_id, on_delete: :delete_all),
        null: false

      add :notification_app_id,
          references(:notification_apps, type: :binary_id, on_delete: :delete_all),
          null: false

      add :app_environment_id,
          references(:app_environments, type: :binary_id, on_delete: :delete_all),
          null: false

      add :source_server_api_key_id,
          references(:environment_server_api_keys, type: :binary_id, on_delete: :nilify_all)

      add :source_kind, :string, null: false
      add :event_name, :string, null: false
      add :recipient_id, :string, null: false
      add :payload, :map, null: false
      add :metadata, :map, null: false, default: %{}
      add :occurred_at, :utc_datetime
      add :accepted_at, :utc_datetime, null: false
      add :payload_size, :integer, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:notification_events, [:workspace_id, :accepted_at])
    create index(:notification_events, [:notification_app_id, :accepted_at])
    create index(:notification_events, [:app_environment_id, :accepted_at])
    create index(:notification_events, [:source_server_api_key_id])

    create constraint(:notification_events, :notification_events_source_kind,
             check: "source_kind IN ('public_api', 'dashboard_test')"
           )

    create constraint(:notification_events, :notification_events_event_name,
             check:
               "char_length(event_name) BETWEEN 1 AND 120 AND event_name ~ '^[a-z0-9_]+(\\.[a-z0-9_]+)*$'"
           )

    create constraint(:notification_events, :notification_events_recipient_id,
             check: "char_length(recipient_id) BETWEEN 1 AND 255"
           )

    create constraint(:notification_events, :notification_events_payload_size,
             check: "payload_size >= 0"
           )

    create table(:notification_ingress_idempotency_keys, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :app_environment_id,
          references(:app_environments, type: :binary_id, on_delete: :delete_all),
          null: false

      add :idempotency_key_digest, :binary, null: false
      add :request_fingerprint, :binary, null: false
      add :fingerprint_version, :string, null: false

      add :notification_event_id,
          references(:notification_events, type: :binary_id, on_delete: :delete_all),
          null: false

      add :expires_at, :utc_datetime, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(
             :notification_ingress_idempotency_keys,
             [:app_environment_id, :idempotency_key_digest],
             name: :notification_ingress_idempotency_keys_environment_digest_index
           )

    create index(:notification_ingress_idempotency_keys, [:expires_at])

    create constraint(
             :notification_ingress_idempotency_keys,
             :notification_ingress_idempotency_keys_digest_length,
             check: "octet_length(idempotency_key_digest) = 32"
           )

    create constraint(
             :notification_ingress_idempotency_keys,
             :notification_ingress_idempotency_keys_fingerprint_length,
             check: "octet_length(request_fingerprint) = 32"
           )

    create constraint(
             :notification_ingress_idempotency_keys,
             :notification_ingress_idempotency_keys_fingerprint_version,
             check: "char_length(fingerprint_version) BETWEEN 1 AND 64"
           )

    create table(:notification_event_outbox, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :notification_event_id,
          references(:notification_events, type: :binary_id, on_delete: :delete_all),
          null: false

      add :app_environment_id,
          references(:app_environments, type: :binary_id, on_delete: :delete_all),
          null: false

      add :recipient_id, :string, null: false
      add :event_name, :string, null: false
      add :status, :string, null: false, default: "pending"
      add :available_at, :utc_datetime, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:notification_event_outbox, [:notification_event_id],
             name: :notification_event_outbox_notification_event_id_index
           )

    create index(:notification_event_outbox, [:status, :available_at])
    create index(:notification_event_outbox, [:app_environment_id, :available_at])

    create constraint(:notification_event_outbox, :notification_event_outbox_status,
             check: "status IN ('pending', 'processing', 'published')"
           )

    create constraint(:notification_event_outbox, :notification_event_outbox_event_name,
             check:
               "char_length(event_name) BETWEEN 1 AND 120 AND event_name ~ '^[a-z0-9_]+(\\.[a-z0-9_]+)*$'"
           )

    create constraint(:notification_event_outbox, :notification_event_outbox_recipient_id,
             check: "char_length(recipient_id) BETWEEN 1 AND 255"
           )
  end
end
