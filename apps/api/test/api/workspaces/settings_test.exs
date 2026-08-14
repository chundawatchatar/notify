defmodule Api.Workspaces.SettingsTest do
  use Api.DataCase, async: true

  alias Api.Workspaces
  alias Api.Workspaces.Workspace

  test "persists partial workspace name and timezone updates without changing the slug" do
    owner = insert(:membership)

    assert owner.workspace.timezone == "UTC"

    assert {:ok, renamed_workspace} =
             Workspaces.update_workspace_settings(owner, owner.workspace.slug, %{
               name: "  Acme Platform  "
             })

    assert renamed_workspace.name == "Acme Platform"
    assert renamed_workspace.slug == owner.workspace.slug
    assert renamed_workspace.timezone == "UTC"

    assert {:ok, updated_workspace} =
             Workspaces.update_workspace_settings(owner, owner.workspace.slug, %{
               timezone: "Asia/Kolkata"
             })

    assert updated_workspace.name == "Acme Platform"
    assert updated_workspace.slug == owner.workspace.slug
    assert updated_workspace.timezone == "Asia/Kolkata"

    assert {:ok, persisted_settings} =
             Workspaces.get_workspace_settings(owner, owner.workspace.slug)

    assert persisted_settings.name == "Acme Platform"
    assert persisted_settings.timezone == "Asia/Kolkata"
  end

  test "rejects invalid settings atomically and does not accept informational fields" do
    owner = insert(:membership)

    assert {:error, invalid_timezone_changeset} =
             Workspaces.update_workspace_settings(owner, owner.workspace.slug, %{
               name: "Renamed Workspace",
               timezone: "IST"
             })

    assert "must be a canonical IANA timezone identifier" in errors_on(invalid_timezone_changeset).timezone

    unchanged_workspace = Repo.get!(Workspace, owner.workspace.id)
    assert unchanged_workspace.name == owner.workspace.name
    assert unchanged_workspace.timezone == "UTC"

    assert {:error, unsupported_field_changeset} =
             Workspaces.update_workspace_settings(owner, owner.workspace.slug, %{
               slug: "renamed-workspace"
             })

    assert "contains unsupported settings fields" in errors_on(unsupported_field_changeset).base

    assert {:error, empty_changeset} =
             Workspaces.update_workspace_settings(owner, owner.workspace.slug, %{})

    assert "must include at least one editable setting" in errors_on(empty_changeset).base
  end

  test "uses only an active persisted membership and never updates another workspace" do
    developer = insert(:membership, role: "developer")
    other_workspace = insert(:workspace)
    forged_owner = %{developer | role: "owner"}

    assert {:ok, _settings} =
             Workspaces.get_workspace_settings(developer, developer.workspace.slug)

    assert {:error, :forbidden} =
             Workspaces.update_workspace_settings(
               forged_owner,
               developer.workspace.slug,
               %{name: "Forbidden Rename"}
             )

    assert {:error, :not_found} =
             Workspaces.update_workspace_settings(developer, other_workspace.slug, %{
               name: "Tenant Escape"
             })

    assert {:error, :not_found} =
             Workspaces.get_workspace_settings(developer, other_workspace.slug)

    assert Repo.get!(Workspace, developer.workspace.id).name == developer.workspace.name
    assert Repo.get!(Workspace, other_workspace.id).name == other_workspace.name

    developer
    |> change(status: "removed", removed_at: DateTime.utc_now(:second))
    |> Repo.update!()

    assert {:error, :not_found} =
             Workspaces.get_workspace_settings(developer, developer.workspace.slug)

    assert {:error, :not_found} =
             Workspaces.update_workspace_settings(developer, developer.workspace.slug, %{
               name: "Removed Member Rename"
             })
  end
end
