defmodule Api.Workspaces.Workspace do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspaces" do
    field :name, :string

    has_many :memberships, Api.Workspaces.Membership

    timestamps(type: :utc_datetime)
  end

  def changeset(workspace, attrs) do
    workspace
    |> cast(attrs, [:name])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:name])
    |> validate_length(:name, min: 2, max: 100)
    |> check_constraint(:name, name: :workspaces_name_length)
  end
end
