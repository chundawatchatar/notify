defmodule ApiWeb.NotificationIngressControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.NotificationApps

  @origin "http://localhost:3100"
  @password "correct-password"

  test "accepts an authenticated event and replays the same idempotency key", %{conn: conn} do
    membership = insert(:membership, role: "developer")

    {:ok, app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    environment = Enum.find(app.environments, &(&1.environment_slug == "development"))

    {:ok, %{secret: secret}} =
      NotificationApps.create_server_api_key(
        membership,
        app.id,
        environment.id,
        %{name: "Ingest Worker"}
      )

    request = %{
      event: "invoice.payment_failed",
      recipient: %{id: "user_123"},
      payload: %{invoice_id: "inv_123"}
    }

    first =
      conn
      |> put_req_header("authorization", "Bearer #{secret}")
      |> put_req_header("idempotency-key", "payment-123")
      |> post("/api/v1/notifications", request)
      |> json_response(202)

    duplicate =
      build_conn()
      |> put_req_header("authorization", "Bearer #{secret}")
      |> put_req_header("idempotency-key", "payment-123")
      |> post("/api/v1/notifications", request)
      |> json_response(200)

    assert first["data"]["duplicate"] == false
    assert duplicate["data"]["duplicate"] == true
    assert duplicate["data"]["event_id"] == first["data"]["event_id"]
  end

  test "rejects invalid server API keys without revealing tenant details", %{conn: conn} do
    response =
      conn
      |> put_req_header("authorization", "Bearer nfy_sk_invalid")
      |> put_req_header("idempotency-key", "payment-123")
      |> post("/api/v1/notifications", %{
        event: "invoice.payment_failed",
        recipient: %{id: "user_123"},
        payload: %{}
      })
      |> json_response(401)

    assert response["errors"]["code"] == "unauthorized"
  end

  test "rejects a conflicting idempotency replay", %{conn: conn} do
    membership = insert(:membership, role: "developer")

    {:ok, app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    environment = Enum.find(app.environments, &(&1.environment_slug == "development"))

    {:ok, %{secret: secret}} =
      NotificationApps.create_server_api_key(membership, app.id, environment.id, %{name: "Worker"})

    headers = fn connection ->
      connection
      |> put_req_header("authorization", "Bearer #{secret}")
      |> put_req_header("idempotency-key", "payment-123")
    end

    headers.(conn)
    |> post("/api/v1/notifications", %{
      event: "invoice.payment_failed",
      recipient: %{id: "user_123"},
      payload: %{invoice_id: "inv_123"}
    })
    |> json_response(202)

    response =
      headers.(build_conn())
      |> post("/api/v1/notifications", %{
        event: "invoice.payment_failed",
        recipient: %{id: "user_123"},
        payload: %{invoice_id: "inv_456"}
      })
      |> json_response(409)

    assert response["errors"]["code"] == "idempotency_key_conflict"
  end

  test "dashboard ingress resolution is workspace scoped", %{conn: conn} do
    membership = insert(:membership)
    other_workspace = insert(:workspace)
    access_token = login(conn, membership.user.email)

    {:ok, other_app} =
      NotificationApps.create_notification_app(other_workspace, %{name: "Payments"})

    environment = Enum.find(other_app.environments, &(&1.environment_slug == "development"))

    response =
      authenticated_conn(access_token)
      |> get("/api/apps/#{other_app.id}/environments/#{environment.id}/ingress")
      |> json_response(404)

    assert response["errors"]["code"] == "environment_not_found"
  end

  test "dashboard users can accept a test event without a server API key", %{conn: conn} do
    membership = insert(:membership, role: "developer")
    access_token = login(conn, membership.user.email)

    {:ok, app} =
      NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    environment = Enum.find(app.environments, &(&1.environment_slug == "development"))

    response =
      authenticated_conn(access_token)
      |> post("/api/apps/#{app.id}/environments/#{environment.id}/ingress/test-events", %{
        event: "test.notification_sent",
        recipient: %{id: "dashboard-test"},
        payload: %{source: "notify-dashboard"}
      })
      |> json_response(202)

    assert response["data"]["duplicate"] == false
  end

  defp authenticated_conn(access_token) do
    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
  end

  defp login(conn, email) do
    conn
    |> put_req_header("origin", @origin)
    |> post("/api/auth/login", %{email: email, password: @password})
    |> json_response(200)
    |> Map.fetch!("access_token")
  end
end
