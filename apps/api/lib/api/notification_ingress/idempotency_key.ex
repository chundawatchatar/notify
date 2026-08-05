defmodule Api.NotificationIngress.IdempotencyKey do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notification_ingress_idempotency_keys" do
    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    belongs_to :notification_event, Api.NotificationIngress.NotificationEvent

    field :idempotency_key_digest, :binary
    field :request_fingerprint, :binary
    field :fingerprint_version, :string
    field :expires_at, :utc_datetime

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(idempotency_key, attrs) do
    idempotency_key
    |> cast(attrs, [
      :app_environment_id,
      :idempotency_key_digest,
      :request_fingerprint,
      :fingerprint_version,
      :notification_event_id,
      :expires_at
    ])
    |> validate_required([
      :app_environment_id,
      :idempotency_key_digest,
      :request_fingerprint,
      :fingerprint_version,
      :notification_event_id,
      :expires_at
    ])
    |> validate_length(:fingerprint_version, min: 1, max: 64)
    |> validate_change(:idempotency_key_digest, &validate_digest/2)
    |> validate_change(:request_fingerprint, &validate_digest/2)
    |> foreign_key_constraint(:app_environment_id)
    |> foreign_key_constraint(:notification_event_id)
    |> unique_constraint(:idempotency_key_digest,
      name: :notification_ingress_idempotency_keys_environment_digest_index
    )
    |> check_constraint(:idempotency_key_digest,
      name: :notification_ingress_idempotency_keys_digest_length
    )
    |> check_constraint(:request_fingerprint,
      name: :notification_ingress_idempotency_keys_fingerprint_length
    )
    |> check_constraint(:fingerprint_version,
      name: :notification_ingress_idempotency_keys_fingerprint_version
    )
  end

  defp validate_digest(field, value) do
    if is_binary(value) and byte_size(value) == 32,
      do: [],
      else: [{field, "must be a 32-byte digest"}]
  end
end
