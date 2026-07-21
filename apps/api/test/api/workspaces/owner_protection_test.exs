defmodule Api.Workspaces.OwnerProtectionTest do
  use Api.DataCase, async: false

  alias Api.Workspaces
  alias Api.Workspaces.AuditEvent

  test "rejects demoting the final workspace owner" do
    membership = insert(:membership)

    assert {:error, :last_active_owner} = Workspaces.update_membership_role(membership, "admin")
  end

  test "allows an owner change when another owner remains" do
    membership = insert(:membership)
    insert(:membership, workspace: membership.workspace)

    assert {:ok, updated_membership} = Workspaces.update_membership_role(membership, "admin")
    assert updated_membership.role == "admin"

    assert %AuditEvent{action: "membership_role_changed", target_id: target_id} =
             Repo.get_by(AuditEvent, action: "membership_role_changed")

    assert target_id == membership.id

    assert %AuditEvent{action: "workspace_owner_changed", target_id: owner_target_id} =
             Repo.get_by(AuditEvent, action: "workspace_owner_changed")

    assert owner_target_id == membership.id
  end

  test "rejects removing the final workspace owner" do
    membership = insert(:membership)

    assert {:error, :last_active_owner} = Workspaces.remove_membership(membership)
    assert Repo.get!(Api.Workspaces.Membership, membership.id)
  end

  test "records the acting membership when it removes another member" do
    owner = insert(:membership)
    member = insert(:membership, workspace: owner.workspace, role: "developer")

    assert {:ok, _removed_membership} = Workspaces.remove_membership(owner, member)

    assert %AuditEvent{
             action: "membership_removed",
             actor_workspace_membership_id: actor_id,
             target_id: target_id
           } = Repo.get_by(AuditEvent, action: "membership_removed")

    assert actor_id == owner.id
    assert target_id == member.id
  end
end
