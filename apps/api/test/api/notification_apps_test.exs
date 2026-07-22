defmodule Api.NotificationAppsTest do
  use Api.DataCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationApps.NotificationApp
  alias Ecto.Adapters.SQL.Sandbox

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

  test "serializes truncated slug allocation across a workspace" do
    base_name = String.duplicate("a", 50)
    suffixed_name = String.duplicate("a", 48) <> "-2"

    workspace =
      Sandbox.unboxed_run(Repo, fn ->
        workspace = insert(:workspace)

        assert {:ok, _notification_app} =
                 NotificationApps.create_notification_app(workspace, %{name: base_name})

        workspace
      end)

    on_exit(fn ->
      Sandbox.unboxed_run(Repo, fn -> Repo.delete!(workspace) end)
    end)

    first_task = allocate_slug(workspace, base_name)
    first_task_pid = first_task.pid

    assert_receive {:slug_allocated, ^first_task_pid, first_slug}
    assert first_slug == suffixed_name

    second_task = allocate_slug(workspace, suffixed_name)
    second_task_pid = second_task.pid

    assert_receive {:slug_allocation_attempted, ^second_task_pid}
    refute_receive {:slug_allocated, ^second_task_pid, _slug}, 100

    send(first_task_pid, :commit)
    assert {:ok, ^first_slug} = Task.await(first_task)

    assert_receive {:slug_allocated, ^second_task_pid, second_slug}
    assert second_slug == String.duplicate("a", 48) <> "-3"

    send(second_task_pid, :commit)
    assert {:ok, ^second_slug} = Task.await(second_task)
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

  defp allocate_slug(workspace, name) do
    parent = self()

    Task.async(fn ->
      :ok = Sandbox.checkout(Repo, sandbox: false)

      try do
        Repo.transaction(fn ->
          send(parent, {:slug_allocation_attempted, self()})

          {:ok, app_slug} = NotificationApp.next_available_slug(Repo, workspace.id, name)
          send(parent, {:slug_allocated, self(), app_slug})

          receive do
            :commit -> :ok
          end

          NotificationApp.changeset(%NotificationApp{}, %{
            workspace_id: workspace.id,
            name: name,
            app_slug: app_slug
          })
          |> Repo.insert!()

          app_slug
        end)
      after
        :ok = Sandbox.checkin(Repo)
      end
    end)
  end
end
