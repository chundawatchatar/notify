defmodule ApiWeb.MetricsControllerTest do
  use ApiWeb.ConnCase, async: false

  setup do
    previous_enabled = Application.get_env(:api, :metrics_enabled)
    previous_token = Application.get_env(:api, :metrics_token)
    Application.put_env(:api, :metrics_token, "metrics-test-token")

    on_exit(fn ->
      Application.put_env(:api, :metrics_enabled, previous_enabled)
      Application.put_env(:api, :metrics_token, previous_token)
    end)
  end

  test "GET /metrics is not exposed when metrics are disabled", %{conn: conn} do
    Application.put_env(:api, :metrics_enabled, false)

    assert conn |> get("/metrics") |> response(404) == ""
  end

  test "GET /metrics requires the configured bearer token", %{conn: conn} do
    conn = get(conn, "/metrics")

    assert response(conn, 401) == ""
    assert get_resp_header(conn, "www-authenticate") == ["Bearer"]
  end

  test "GET /metrics returns a Prometheus scrape", %{conn: conn} do
    get(build_conn(), "/api/health/live")

    conn =
      conn
      |> put_req_header("authorization", "Bearer metrics-test-token")
      |> get("/metrics")

    assert response(conn, 200) =~ "phoenix_endpoint_stop_count"
    assert get_resp_header(conn, "content-type") == ["text/plain; version=0.0.4; charset=utf-8"]
  end
end
