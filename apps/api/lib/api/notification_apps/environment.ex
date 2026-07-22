defmodule Api.NotificationApps.Environment do
  use Ecto.Schema

  import Ecto.Changeset

  alias Domain.NotificationAppSlug

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "app_environments" do
    field :name, :string
    field :environment_slug, :string
    field :production, :boolean, default: false

    belongs_to :notification_app, Api.NotificationApps.NotificationApp
    has_many :client_keys, Api.NotificationApps.ClientKey, foreign_key: :app_environment_id

    has_many :trusted_origins, Api.NotificationApps.TrustedOrigin,
      foreign_key: :app_environment_id

    timestamps(type: :utc_datetime)
  end

  @doc """
  Validates an app environment before it is persisted.
  """
  def changeset(environment, attrs) do
    environment
    |> cast(attrs, [:notification_app_id, :name, :environment_slug, :production])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:notification_app_id, :name, :environment_slug, :production])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_change(:environment_slug, fn :environment_slug, environment_slug ->
      if NotificationAppSlug.valid?(environment_slug),
        do: [],
        else: [environment_slug: "must be lowercase kebab-case"]
    end)
    |> foreign_key_constraint(:notification_app_id)
    |> unique_constraint(:environment_slug,
      name: :app_environments_notification_app_id_environment_slug_index
    )
    |> unique_constraint(:production,
      name: :app_environments_one_production_per_notification_app_index
    )
    |> check_constraint(:name, name: :app_environments_name_length)
    |> check_constraint(:environment_slug, name: :app_environments_environment_slug_format)
  end
end
