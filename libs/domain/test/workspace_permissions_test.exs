defmodule Domain.WorkspacePermissionsTest do
  use ExUnit.Case, async: true

  alias Domain.WorkspacePermissions

  test "applies the documented workspace permission matrix" do
    assert WorkspacePermissions.allowed?("owner", :delete_workspace)
    assert WorkspacePermissions.allowed?("admin", :manage_billing)
    refute WorkspacePermissions.allowed?("admin", :manage_owners)
    assert WorkspacePermissions.allowed?("developer", :manage_apps)
    refute WorkspacePermissions.allowed?("developer", :view_billing)
    assert WorkspacePermissions.allowed?("viewer", :view_events)
    refute WorkspacePermissions.allowed?("viewer", :create_apps)
  end

  test "fails closed for unknown roles and actions" do
    refute WorkspacePermissions.allowed?("unknown", :view_workspace)
    refute WorkspacePermissions.allowed?("viewer", :unknown_action)
    refute WorkspacePermissions.allowed?(:owner, :view_workspace)
  end
end
