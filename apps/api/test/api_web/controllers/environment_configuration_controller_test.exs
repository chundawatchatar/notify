defmodule ApiWeb.EnvironmentConfigurationControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.NotificationApps

  @origin "http://localhost:3100"
  @password "correct-password"

  test "client keys are independent per environment and revocation deactivates the key", %{
    conn: conn
  } do
    membership = insert(:membership, role: "developer")
    access_token = login(conn, membership.user.email)

    {:ok, notification_app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    production = Enum.find(notification_app.environments, &(&1.environment_slug == "production"))

    created =
      authenticated_conn(access_token)
      |> post(client_keys_path(notification_app.app_slug, development.environment_slug))
      |> json_response(201)

    assert String.starts_with?(created["key"], "nfy_pk_")
    assert created["revoked_at"] == nil

    assert %{"client_keys" => [^created]} =
             authenticated_conn(access_token)
             |> get(client_keys_path(notification_app.app_slug, development.environment_slug))
             |> json_response(200)

    assert %{"client_keys" => []} =
             authenticated_conn(access_token)
             |> get(client_keys_path(notification_app.app_slug, production.environment_slug))
             |> json_response(200)

    authenticated_conn(access_token)
    |> delete(
      client_key_path(notification_app.app_slug, development.environment_slug, created["id"])
    )
    |> response(204)

    assert %{"client_keys" => [%{"revoked_at" => revoked_at}]} =
             authenticated_conn(access_token)
             |> get(client_keys_path(notification_app.app_slug, development.environment_slug))
             |> json_response(200)

    assert is_binary(revoked_at)
  end

  test "trusted origins are normalized, unique per environment, and validated", %{conn: conn} do
    membership = insert(:membership, role: "developer")
    access_token = login(conn, membership.user.email)

    {:ok, notification_app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    path = trusted_origins_path(notification_app.app_slug, "development")

    created =
      authenticated_conn(access_token)
      |> post(path, %{origin: "HTTPS://Console.Example.com:443"})
      |> json_response(201)

    assert created["origin"] == "https://console.example.com"

    ipv6_origin =
      authenticated_conn(access_token)
      |> post(path, %{origin: "http://[::1]:3100"})
      |> json_response(201)

    assert ipv6_origin["origin"] == "http://[::1]:3100"

    duplicate =
      authenticated_conn(access_token)
      |> post(path, %{origin: "https://console.example.com"})
      |> json_response(409)

    assert duplicate["errors"]["code"] == "trusted_origin_exists"

    invalid =
      authenticated_conn(access_token)
      |> post(path, %{origin: "https://*.example.com"})
      |> json_response(422)

    assert invalid["errors"]["fields"]["origin"]

    authenticated_conn(access_token)
    |> delete(trusted_origin_path(notification_app.app_slug, "development", created["id"]))
    |> response(204)

    assert %{"trusted_origins" => trusted_origins} =
             authenticated_conn(access_token)
             |> get(path)
             |> json_response(200)

    refute Enum.any?(trusted_origins, &(&1["id"] == created["id"]))
  end

  test "viewers can inspect configuration but cannot change it", %{conn: conn} do
    membership = insert(:membership, role: "viewer")
    access_token = login(conn, membership.user.email)

    {:ok, notification_app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    path = client_keys_path(notification_app.app_slug, "development")

    authenticated_conn(access_token)
    |> get(path)
    |> json_response(200)

    response =
      authenticated_conn(access_token)
      |> post(path)
      |> json_response(403)

    assert response["errors"]["code"] == "forbidden"
  end

  test "cross-workspace environment paths do not expose configuration", %{conn: conn} do
    membership = insert(:membership)
    other_workspace = insert(:workspace)
    access_token = login(conn, membership.user.email)

    {:ok, other_app} =
      NotificationApps.create_notification_app(other_workspace, %{name: "Payments"})

    response =
      authenticated_conn(access_token)
      |> get(client_keys_path(other_app.app_slug, "development"))
      |> json_response(404)

    assert response["errors"]["code"] == "environment_not_found"
  end

  defp authenticated_conn(access_token) do
    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
  end

  defp client_keys_path(app_slug, environment_slug) do
    ~p"/api/apps/#{app_slug}/environments/#{environment_slug}/client-keys"
  end

  defp client_key_path(app_slug, environment_slug, client_key_id) do
    ~p"/api/apps/#{app_slug}/environments/#{environment_slug}/client-keys/#{client_key_id}"
  end

  defp trusted_origins_path(app_slug, environment_slug) do
    ~p"/api/apps/#{app_slug}/environments/#{environment_slug}/trusted-origins"
  end

  defp trusted_origin_path(app_slug, environment_slug, trusted_origin_id) do
    ~p"/api/apps/#{app_slug}/environments/#{environment_slug}/trusted-origins/#{trusted_origin_id}"
  end

  defp login(conn, email) do
    response =
      conn
      |> put_req_header("origin", @origin)
      |> post(~p"/api/auth/login", %{email: email, password: @password})
      |> json_response(200)

    response["access_token"]
  end
end
