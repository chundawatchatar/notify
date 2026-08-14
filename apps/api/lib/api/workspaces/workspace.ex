defmodule Api.Workspaces.Workspace do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Domain.WorkspaceSlug

  @settings_fields ~w(name timezone)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspaces" do
    field :name, :string
    field :slug, :string
    field :timezone, :string, default: "UTC"

    has_many :memberships, Api.Workspaces.Membership
    has_many :notification_apps, Api.NotificationApps.NotificationApp

    timestamps(type: :utc_datetime)
  end

  def changeset(workspace, attrs) do
    workspace
    |> cast(attrs, [:name, :slug])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:name])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_required([:slug])
    |> validate_change(:slug, fn :slug, slug ->
      if WorkspaceSlug.valid?(slug), do: [], else: [slug: "must be lowercase kebab-case"]
    end)
    |> unique_constraint(:slug, name: :workspaces_slug_lower_index)
    |> check_constraint(:name, name: :workspaces_name_length)
    |> check_constraint(:slug, name: :workspaces_slug_format)
  end

  def settings_changeset(workspace, attrs) when is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    workspace
    |> cast(attrs, [:name, :timezone])
    |> update_change(:name, fn name -> if is_binary(name), do: String.trim(name), else: name end)
    |> validate_required([:name, :timezone])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_change(:timezone, fn :timezone, timezone ->
      if timezone == "UTC" or timezone in TzExtra.time_zone_ids(),
        do: [],
        else: [timezone: "must be a canonical IANA timezone identifier"]
    end)
    |> validate_settings_fields(attrs)
    |> check_constraint(:name, name: :workspaces_name_length)
    |> check_constraint(:timezone, name: :workspaces_timezone_length)
  end

  @doc """
  Allocates the first available slug for a workspace name within the current transaction.
  """
  def next_available_slug(repo, name) do
    base_slug = WorkspaceSlug.normalize(name)

    Ecto.Adapters.SQL.query!(repo, "SELECT pg_advisory_xact_lock(hashtext($1))", [base_slug])

    {:ok, first_available_slug(repo, base_slug)}
  end

  defp first_available_slug(repo, base_slug) do
    1
    |> Stream.iterate(&(&1 + 1))
    |> Enum.find_value(fn suffix ->
      slug = if suffix == 1, do: base_slug, else: WorkspaceSlug.with_suffix(base_slug, suffix)

      if slug_available?(repo, slug), do: slug
    end)
  end

  defp slug_available?(repo, slug) do
    not repo.exists?(
      from workspace in __MODULE__,
        where: fragment("lower(?) = ?", workspace.slug, ^slug)
    )
  end

  defp validate_settings_fields(changeset, attrs) do
    case Map.keys(attrs) do
      [] ->
        add_error(changeset, :base, "must include at least one editable setting")

      keys ->
        if Enum.all?(keys, &(&1 in @settings_fields)),
          do: changeset,
          else: add_error(changeset, :base, "contains unsupported settings fields")
    end
  end
end
