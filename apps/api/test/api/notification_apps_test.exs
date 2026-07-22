defmodule Api.NotificationAppsTest do
  use Api.DataCase, async: true

  alias Api.NotificationApps

  test "creates an app with its default environments atomically" do
    workspace = insert(:workspace)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    assert notification_app.workspace_id == workspace.id
    assert notification_app.app_slug == "payments-service"

    assert notification_app.environments
           |> Enum.map(&{&1.name, &1.environment_slug, &1.production})
           |> Enum.sort() ==
             [
               {"Development", "development", false},
               {"Production", "production", true}
             ]
  end

  test "allocates app slugs within a workspace and allows them in another workspace" do
    workspace = insert(:workspace)
    other_workspace = insert(:workspace)

    assert {:ok, first_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    assert {:ok, second_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    assert {:ok, other_workspace_app} =
             NotificationApps.create_notification_app(other_workspace, %{name: "Payments Service"})

    assert first_app.app_slug == "payments-service"
    assert second_app.app_slug == "payments-service-2"
    assert other_workspace_app.app_slug == "payments-service"
  end

  test "scopes app list and lookups to the current workspace" do
    workspace = insert(:workspace)
    other_workspace = insert(:workspace)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    assert [listed_app] = NotificationApps.list_notification_apps(workspace)
    assert listed_app.id == notification_app.id
    assert NotificationApps.list_notification_apps(other_workspace) == []

    assert NotificationApps.get_notification_app(workspace, notification_app.id).id ==
             notification_app.id

    assert NotificationApps.get_notification_app(other_workspace, notification_app.id) == nil

    assert NotificationApps.get_notification_app_by_slug(workspace, "payments-service").id ==
             notification_app.id

    assert NotificationApps.get_notification_app_by_slug(other_workspace, "payments-service") ==
             nil
  end
end
