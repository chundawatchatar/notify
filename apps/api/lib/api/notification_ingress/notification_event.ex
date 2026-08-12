defmodule Api.NotificationIngress.NotificationEvent do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notification_events" do
    belongs_to :workspace, Api.Workspaces.Workspace
    belongs_to :notification_app, Api.NotificationApps.NotificationApp

    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    belongs_to :source_server_api_key, Api.NotificationApps.ServerApiKey

    field :source_kind, :string
    field :event_name, :string
    field :recipient_id, :string
    field :payload, :map
    field :metadata, :map, default: %{}
    field :occurred_at, :utc_datetime
    field :accepted_at, :utc_datetime
    field :payload_size, :integer
    field :delivery_status, :string, virtual: true

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [
      :workspace_id,
      :notification_app_id,
      :app_environment_id,
      :source_server_api_key_id,
      :source_kind,
      :event_name,
      :recipient_id,
      :payload,
      :metadata,
      :occurred_at,
      :accepted_at,
      :payload_size
    ])
    |> validate_required([
      :workspace_id,
      :notification_app_id,
      :app_environment_id,
      :source_kind,
      :event_name,
      :recipient_id,
      :payload,
      :metadata,
      :accepted_at,
      :payload_size
    ])
    |> validate_inclusion(:source_kind, ["public_api", "dashboard_test"])
    |> validate_length(:event_name, min: 1, max: 120)
    |> validate_format(:event_name, ~r/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/)
    |> validate_length(:recipient_id, min: 1, max: 255)
    |> validate_number(:payload_size, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:workspace_id)
    |> foreign_key_constraint(:notification_app_id)
    |> foreign_key_constraint(:app_environment_id)
    |> foreign_key_constraint(:source_server_api_key_id)
    |> check_constraint(:source_kind, name: :notification_events_source_kind)
    |> check_constraint(:event_name, name: :notification_events_event_name)
    |> check_constraint(:recipient_id, name: :notification_events_recipient_id)
    |> check_constraint(:payload_size, name: :notification_events_payload_size)
  end
end
