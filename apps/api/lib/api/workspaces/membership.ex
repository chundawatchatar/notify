defmodule Api.Workspaces.Membership do
  use Ecto.Schema

  import Ecto.Changeset

  alias Domain.WorkspacePermissions

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspace_memberships" do
    field :role, :string
    field :status, :string, default: "active"
    field :joined_at, :utc_datetime
    field :removed_at, :utc_datetime

    belongs_to :user, Api.Accounts.User
    belongs_to :workspace, Api.Workspaces.Workspace
    has_many :auth_sessions, Api.Accounts.AuthSession, foreign_key: :workspace_membership_id

    timestamps(type: :utc_datetime)
  end

  def changeset(membership, attrs) do
    membership
    |> cast(attrs, [:user_id, :workspace_id, :role, :status, :joined_at, :removed_at])
    |> validate_required([:user_id, :workspace_id, :role, :status, :joined_at])
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> validate_inclusion(:status, ["active", "removed"])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:workspace_id)
    |> unique_constraint([:user_id, :workspace_id])
    |> check_constraint(:role, name: :workspace_memberships_role)
    |> check_constraint(:status, name: :workspace_memberships_status)
  end

  def role_changeset(membership, role) do
    membership
    |> cast(%{role: role}, [:role])
    |> validate_required([:role])
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> check_constraint(:role, name: :workspace_memberships_role)
  end

  def removal_changeset(membership, now),
    do: change(membership, status: "removed", removed_at: now)

  def reactivation_changeset(membership, role, now) do
    membership
    |> change(role: role, status: "active", joined_at: now, removed_at: nil)
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> check_constraint(:role, name: :workspace_memberships_role)
    |> check_constraint(:status, name: :workspace_memberships_status)
  end
end
