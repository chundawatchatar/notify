defmodule Api.Workspaces.AuditEventTest do
  use Api.DataCase, async: true

  alias Api.Workspaces.AuditEvent

  test "rejects metadata with unsupported map keys without raising" do
    changeset =
      AuditEvent.changeset(%AuditEvent{}, %{
        workspace_id: Ecto.UUID.generate(),
        action: "membership_removed",
        target_type: "workspace_membership",
        metadata: %{{:unsupported, :key} => "value"}
      })

    assert %{metadata: ["must be JSON encodable"]} = errors_on(changeset)
  end
end
