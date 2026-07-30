defmodule Api.NotificationAppsTest do
  use Api.DataCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationApps.{NotificationApp, ServerApiKey}
  alias Api.Workspaces.AuditEvent
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

  test "readiness preloads exclude revoked client keys" do
    workspace = insert(:workspace)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, active_client_key} = NotificationApps.create_client_key(development)
    assert {:ok, revoked_client_key} = NotificationApps.create_client_key(development)

    assert {:ok, _revoked_client_key} =
             NotificationApps.revoke_client_key(development, revoked_client_key.id)

    reloaded_app = NotificationApps.get_notification_app_by_slug(workspace, "payments-service")

    reloaded_development =
      Enum.find(reloaded_app.environments, &(&1.environment_slug == "development"))

    assert Enum.map(reloaded_development.client_keys, & &1.id) == [active_client_key.id]
  end

  test "renames an app without changing its slug and excludes archived apps" do
    workspace = insert(:workspace)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: "Payments Service"})

    assert {:ok, renamed_notification_app} =
             NotificationApps.update_notification_app(workspace, "payments-service", %{
               name: "Payments Platform"
             })

    assert renamed_notification_app.name == "Payments Platform"
    assert renamed_notification_app.app_slug == "payments-service"

    assert {:error, :not_found} =
             NotificationApps.update_notification_app(workspace, "missing-app", %{name: "Missing"})

    assert {:error, :not_found} =
             NotificationApps.archive_notification_app(workspace, "missing-app")

    assert :ok = NotificationApps.archive_notification_app(workspace, "payments-service")
    assert NotificationApps.list_notification_apps(workspace) == []
    assert NotificationApps.get_notification_app(workspace, notification_app.id) == nil
    assert NotificationApps.get_notification_app_by_slug(workspace, "payments-service") == nil

    assert {:error, :archived} =
             NotificationApps.archive_notification_app(workspace, "payments-service")
  end

  test "creates a server api key with one-time secret disclosure and safe persistence" do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, %{server_api_key: server_api_key, secret: secret}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Ingest Worker"
               }
             )

    assert String.starts_with?(secret, "nfy_sk_")
    assert server_api_key.name == "Ingest Worker"
    refute Map.has_key?(server_api_key, :secret_digest)

    persisted_server_api_key = Repo.get!(ServerApiKey, server_api_key.id)

    assert byte_size(persisted_server_api_key.secret_digest) == 32
    refute persisted_server_api_key.secret_digest == secret
    assert persisted_server_api_key.masked_hint == "..." <> String.slice(secret, -4, 4)

    assert %AuditEvent{action: "server_api_key_created", target_id: target_id, metadata: metadata} =
             Repo.get_by(AuditEvent, action: "server_api_key_created")

    assert target_id == persisted_server_api_key.id

    assert metadata == %{
             "app_environment_id" => development.id,
             "environment_id" => development.id,
             "name" => "Ingest Worker"
           }
  end

  test "lists server api keys in stable order and scopes them by environment and workspace" do
    membership = insert(:membership)
    other_membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    assert {:ok, other_notification_app} =
             NotificationApps.create_notification_app(other_membership.workspace, %{
               name: "Billing Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    production =
      Enum.find(notification_app.environments, &(&1.environment_slug == "production"))

    other_development =
      Enum.find(other_notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, _alpha_key} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Alpha"
               }
             )

    assert {:ok, _beta_key} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Beta"
               }
             )

    assert {:ok, _production_key} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               production.id,
               %{
                 name: "Alpha"
               }
             )

    assert {:ok, _other_workspace_key} =
             NotificationApps.create_server_api_key(
               other_membership,
               other_notification_app.id,
               other_development.id,
               %{name: "Alpha"}
             )

    assert {:ok, development_keys} =
             NotificationApps.list_server_api_keys(
               membership.workspace,
               notification_app.id,
               development.id
             )

    assert Enum.map(development_keys, & &1.name) == ["Alpha", "Beta"]
    assert Enum.all?(development_keys, &(not Map.has_key?(&1, :secret_digest)))

    assert {:ok, production_keys} =
             NotificationApps.list_server_api_keys(
               membership.workspace,
               notification_app.id,
               production.id
             )

    assert Enum.map(production_keys, & &1.name) == ["Alpha"]

    assert {:error, :not_found} =
             NotificationApps.list_server_api_keys(
               membership.workspace,
               other_notification_app.id,
               other_development.id
             )
  end

  test "revokes only the active server api key in the selected environment" do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    production =
      Enum.find(notification_app.environments, &(&1.environment_slug == "production"))

    assert {:ok, %{server_api_key: server_api_key}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Ingest Worker"
               }
             )

    assert {:error, :not_found} =
             NotificationApps.revoke_server_api_key(
               membership,
               notification_app.id,
               production.id,
               server_api_key.id
             )

    assert {:ok, revoked_server_api_key} =
             NotificationApps.revoke_server_api_key(
               membership,
               notification_app.id,
               development.id,
               server_api_key.id
             )

    assert revoked_server_api_key.revoked_at

    assert {:error, :not_found} =
             NotificationApps.revoke_server_api_key(
               membership,
               notification_app.id,
               development.id,
               server_api_key.id
             )

    assert %AuditEvent{action: "server_api_key_revoked", metadata: metadata} =
             Repo.get_by(AuditEvent, action: "server_api_key_revoked")

    assert metadata == %{
             "app_environment_id" => development.id,
             "environment_id" => development.id,
             "name" => "Ingest Worker"
           }
  end

  test "rotates a server api key atomically and leaves exactly one replacement active" do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, %{server_api_key: server_api_key}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Ingest Worker"
               }
             )

    assert {:ok, %{server_api_key: replacement_server_api_key, secret: replacement_secret}} =
             NotificationApps.rotate_server_api_key(
               membership,
               notification_app.id,
               development.id,
               server_api_key.id
             )

    assert String.starts_with?(replacement_secret, "nfy_sk_")

    reloaded_server_api_key = Repo.get!(ServerApiKey, server_api_key.id)
    replacement_record = Repo.get!(ServerApiKey, replacement_server_api_key.id)

    assert reloaded_server_api_key.revoked_at
    assert is_nil(replacement_record.revoked_at)
    assert replacement_record.name == reloaded_server_api_key.name

    assert Repo.aggregate(
             from(server_api_key in ServerApiKey,
               where:
                 server_api_key.app_environment_id == ^development.id and
                   is_nil(server_api_key.revoked_at)
             ),
             :count,
             :id
           ) == 1

    assert %AuditEvent{action: "server_api_key_rotated", target_id: target_id, metadata: metadata} =
             Repo.get_by(AuditEvent, action: "server_api_key_rotated")

    assert target_id == server_api_key.id

    assert metadata == %{
             "app_environment_id" => development.id,
             "environment_id" => development.id,
             "name" => "Ingest Worker",
             "replacement_server_api_key_id" => replacement_server_api_key.id
           }
  end

  test "failed rotation leaves the original server api key active and creates no replacement" do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, %{server_api_key: server_api_key}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{
                 name: "Ingest Worker"
               }
             )

    assert {:error, :invalid_secret} =
             NotificationApps.rotate_server_api_key(
               membership,
               notification_app.id,
               development.id,
               server_api_key.id,
               fn -> "bad-secret" end
             )

    reloaded_server_api_key = Repo.get!(ServerApiKey, server_api_key.id)

    assert is_nil(reloaded_server_api_key.revoked_at)

    assert Repo.aggregate(
             from(server_api_key in ServerApiKey,
               where: server_api_key.app_environment_id == ^development.id
             ),
             :count,
             :id
           ) == 1

    assert Repo.get_by(AuditEvent, action: "server_api_key_rotated") == nil
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

          insert(:notification_app,
            workspace: workspace,
            name: name,
            app_slug: app_slug
          )

          app_slug
        end)
      after
        :ok = Sandbox.checkin(Repo)
      end
    end)
  end
end
