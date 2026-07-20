defmodule Api.Workspaces.Workspace do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Domain.WorkspaceSlug

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspaces" do
    field :name, :string
    field :slug, :string

    has_many :memberships, Api.Workspaces.Membership

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
end
