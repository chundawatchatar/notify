defmodule Api.NotificationApps.NotificationApp do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Domain.NotificationAppSlug

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notification_apps" do
    field :name, :string
    field :app_slug, :string
    field :archived_at, :utc_datetime

    belongs_to :workspace, Api.Workspaces.Workspace
    has_many :environments, Api.NotificationApps.Environment

    timestamps(type: :utc_datetime)
  end

  @doc """
  Validates a notification app before it is persisted.
  """
  def changeset(notification_app, attrs) do
    notification_app
    |> cast(attrs, [:workspace_id, :name, :app_slug, :archived_at])
    |> validate_name()
    |> validate_required([:workspace_id, :name, :app_slug])
    |> validate_change(:app_slug, fn :app_slug, app_slug ->
      if NotificationAppSlug.valid?(app_slug),
        do: [],
        else: [app_slug: "must be lowercase kebab-case"]
    end)
    |> foreign_key_constraint(:workspace_id)
    |> unique_constraint(:app_slug, name: :notification_apps_workspace_id_app_slug_index)
    |> check_constraint(:app_slug, name: :notification_apps_app_slug_format)
  end

  @doc """
  Validates a display-name update without changing the app's stable slug.
  """
  def update_changeset(notification_app, attrs) do
    notification_app
    |> cast(attrs, [:name])
    |> validate_name()
    |> validate_required([:name])
  end

  @doc """
  Allocates the first available slug for an app within the current workspace transaction.
  """
  def next_available_slug(repo, workspace_id, name) do
    base_slug = NotificationAppSlug.normalize(name)
    lock_key = "notification-app:#{workspace_id}"

    Ecto.Adapters.SQL.query!(repo, "SELECT pg_advisory_xact_lock(hashtext($1))", [lock_key])

    {:ok, first_available_slug(repo, workspace_id, base_slug)}
  end

  defp first_available_slug(repo, workspace_id, base_slug) do
    1
    |> Stream.iterate(&(&1 + 1))
    |> Enum.find_value(fn suffix ->
      app_slug =
        if suffix == 1,
          do: base_slug,
          else: NotificationAppSlug.with_suffix(base_slug, suffix)

      if app_slug_available?(repo, workspace_id, app_slug), do: app_slug
    end)
  end

  defp app_slug_available?(repo, workspace_id, app_slug) do
    not repo.exists?(
      from notification_app in __MODULE__,
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug
    )
  end

  defp validate_name(changeset) do
    changeset
    |> update_change(:name, &trim_name/1)
    |> validate_length(:name, min: 1, max: 100)
    |> check_constraint(:name, name: :notification_apps_name_length)
  end

  defp trim_name(name) when is_binary(name), do: String.trim(name)
  defp trim_name(name), do: name
end
