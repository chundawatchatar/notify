defmodule Domain.WorkspacePermissions do
  @moduledoc """
  Framework-free workspace role and permission policy.
  """

  @roles ["owner", "admin", "developer", "viewer"]

  @actions [
    :view_workspace,
    :manage_workspace,
    :delete_workspace,
    :view_members,
    :invite_members,
    :manage_members,
    :manage_owners,
    :view_billing,
    :manage_billing,
    :view_apps,
    :create_apps,
    :manage_apps,
    :manage_credentials,
    :view_events
  ]

  @permissions %{
    "owner" => MapSet.new(@actions),
    "admin" => MapSet.new(@actions -- [:delete_workspace, :manage_owners]),
    "developer" =>
      MapSet.new([
        :view_workspace,
        :view_members,
        :view_apps,
        :create_apps,
        :manage_apps,
        :manage_credentials,
        :view_events
      ]),
    "viewer" => MapSet.new([:view_workspace, :view_members, :view_apps, :view_events])
  }

  @doc """
  Returns the supported persisted membership roles.
  """
  @spec roles() :: [String.t()]
  def roles, do: @roles

  @doc """
  Returns the stable actions used by workspace authorization checks.
  """
  @spec actions() :: [atom()]
  def actions, do: @actions

  @doc """
  Returns whether a membership role may perform an action. Unknown roles and actions fail closed.
  """
  @spec allowed?(term(), term()) :: boolean()
  def allowed?(role, action) when is_binary(role) and is_atom(action) do
    @permissions
    |> Map.get(role, MapSet.new())
    |> MapSet.member?(action)
  end

  def allowed?(_role, _action), do: false
end
