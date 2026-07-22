defmodule ApiWeb.NotificationAppControllerTest do
  use ApiWeb.ConnCase, async: true

  @origin "http://localhost:3100"
  @password "correct-password"

  test "an authorized member can create, list, and get apps in the active workspace", %{
    conn: conn
  } do
    membership = insert(:membership, role: "developer")
    other_workspace = insert(:workspace)
    access_token = login(conn, membership.user.email)

    created =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(~p"/api/apps", %{name: "Payments Service", workspace_id: other_workspace.id})
      |> json_response(201)

    assert created["name"] == "Payments Service"
    assert created["slug"] == "payments-service"
    refute Map.has_key?(created, "workspace_id")

    assert created["environments"]
           |> Enum.map(&{&1["name"], &1["slug"], &1["production"]}) ==
             [
               {"Development", "development", false},
               {"Production", "production", true}
             ]

    listed =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/apps")
      |> json_response(200)

    assert listed == %{"apps" => [created]}

    fetched =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/apps/#{created["slug"]}")
      |> json_response(200)

    assert fetched == created
  end

  test "invalid app names return field validation errors", %{conn: conn} do
    membership = insert(:membership)
    access_token = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(~p"/api/apps", %{name: ""})
      |> json_response(422)

    assert response["errors"]["code"] == "validation_failed"
    assert response["errors"]["fields"]["name"]
  end

  test "app lookups do not expose cross-workspace resources", %{conn: conn} do
    membership = insert(:membership)
    other_workspace = insert(:workspace)

    {:ok, _other_app} =
      Api.NotificationApps.create_notification_app(other_workspace, %{name: "Payments"})

    access_token = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/apps/payments")
      |> json_response(404)

    assert response["errors"]["code"] == "app_not_found"
  end

  test "viewer memberships can list apps but cannot create them", %{conn: conn} do
    membership = insert(:membership, role: "viewer")
    access_token = login(conn, membership.user.email)

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> get(~p"/api/apps")
    |> json_response(200)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(~p"/api/apps", %{name: "Payments"})
      |> json_response(403)

    assert response["errors"]["code"] == "forbidden"
  end

  test "app endpoints require an access token", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/apps")
      |> json_response(401)

    assert response["errors"]["code"] == "invalid_access_token"
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
