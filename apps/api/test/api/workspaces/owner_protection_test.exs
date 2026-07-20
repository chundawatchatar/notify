defmodule Api.Workspaces.OwnerProtectionTest do
  use Api.DataCase, async: false

  alias Api.Workspaces

  test "rejects demoting the final workspace owner" do
    membership = insert(:membership)

    assert {:error, :last_active_owner} = Workspaces.update_membership_role(membership, "admin")
  end

  test "allows an owner change when another owner remains" do
    membership = insert(:membership)
    insert(:membership, workspace: membership.workspace)

    assert {:ok, updated_membership} = Workspaces.update_membership_role(membership, "admin")
    assert updated_membership.role == "admin"
  end

  test "rejects removing the final workspace owner" do
    membership = insert(:membership)

    assert {:error, :last_active_owner} = Workspaces.remove_membership(membership)
    assert Repo.get!(Api.Workspaces.Membership, membership.id)
  end
end
