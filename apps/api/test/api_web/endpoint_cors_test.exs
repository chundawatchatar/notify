defmodule ApiWeb.EndpointCorsTest do
  use ApiWeb.ConnCase, async: true

  test "allows the configured dashboard origin", %{conn: conn} do
    conn =
      conn
      |> put_req_header("origin", "http://localhost:3100")
      |> get(~p"/api/version")

    assert get_resp_header(conn, "access-control-allow-origin") == ["http://localhost:3100"]
  end

  test "does not allow an unconfigured origin", %{conn: conn} do
    conn =
      conn
      |> put_req_header("origin", "https://untrusted.example")
      |> get(~p"/api/version")

    assert get_resp_header(conn, "access-control-allow-origin") == []
  end

  test "answers preflight requests for the configured dashboard origin", %{conn: conn} do
    conn =
      conn
      |> put_req_header("origin", "http://localhost:3100")
      |> put_req_header("access-control-request-method", "POST")
      |> options(~p"/api/version")

    assert conn.status == 204
    assert get_resp_header(conn, "access-control-allow-origin") == ["http://localhost:3100"]

    allowed_methods =
      conn
      |> get_resp_header("access-control-allow-methods")
      |> Enum.flat_map(&String.split(&1, ","))

    assert "POST" in allowed_methods
  end
end
