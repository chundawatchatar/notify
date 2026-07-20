defmodule Api.Workspaces.Membership do
  use Ecto.Schema

  import Ecto.Changeset

  alias Domain.WorkspacePermissions

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspace_memberships" do
    field :role, :string

    belongs_to :user, Api.Accounts.User
    belongs_to :workspace, Api.Workspaces.Workspace
    has_many :auth_sessions, Api.Accounts.AuthSession, foreign_key: :workspace_membership_id

    timestamps(type: :utc_datetime)
  end

  def changeset(membership, attrs) do
    membership
    |> cast(attrs, [:user_id, :workspace_id, :role])
    |> validate_required([:user_id, :workspace_id, :role])
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:workspace_id)
    |> unique_constraint([:user_id, :workspace_id])
    |> check_constraint(:role, name: :workspace_memberships_role)
  end

  def role_changeset(membership, role) do
    membership
    |> cast(%{role: role}, [:role])
    |> validate_required([:role])
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> check_constraint(:role, name: :workspace_memberships_role)
  end
end
