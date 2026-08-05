defmodule Api.NotificationIngress.EventOutbox do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notification_event_outbox" do
    belongs_to :notification_event, Api.NotificationIngress.NotificationEvent

    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    field :recipient_id, :string
    field :event_name, :string
    field :status, :string, default: "pending"
    field :available_at, :utc_datetime

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(outbox, attrs) do
    outbox
    |> cast(attrs, [
      :notification_event_id,
      :app_environment_id,
      :recipient_id,
      :event_name,
      :status,
      :available_at
    ])
    |> validate_required([
      :notification_event_id,
      :app_environment_id,
      :recipient_id,
      :event_name,
      :status,
      :available_at
    ])
    |> validate_inclusion(:status, ["pending", "processing", "published"])
    |> validate_length(:event_name, min: 1, max: 120)
    |> validate_format(:event_name, ~r/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/)
    |> validate_length(:recipient_id, min: 1, max: 255)
    |> foreign_key_constraint(:notification_event_id)
    |> foreign_key_constraint(:app_environment_id)
    |> unique_constraint(:notification_event_id,
      name: :notification_event_outbox_notification_event_id_index
    )
    |> check_constraint(:status, name: :notification_event_outbox_status)
    |> check_constraint(:event_name, name: :notification_event_outbox_event_name)
    |> check_constraint(:recipient_id, name: :notification_event_outbox_recipient_id)
  end
end
