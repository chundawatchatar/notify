defmodule ApiWeb.AuthRateLimitTest do
  use ApiWeb.ConnCase, async: true

  alias Api.AuthRateLimiter.{ClientIp, TestStore}

  @origin "http://localhost:3100"

  test "email action budget allows the boundary, rejects excess, and resets", %{conn: conn} do
    for _request <- 1..3 do
      response =
        conn
        |> with_origin()
        |> post(~p"/api/auth/password-reset", %{email: " Missing@Example.COM "})
        |> json_response(202)

      assert response["status"] == "password_reset_requested"
    end

    limited_conn =
      conn
      |> with_origin()
      |> post(~p"/api/auth/password-reset", %{email: "missing@example.com"})

    assert limited_conn |> get_resp_header("retry-after") |> List.first() == "3600"
    assert json_response(limited_conn, 429)["errors"]["code"] == "rate_limited"
    refute Enum.any?(TestStore.keys(), &String.contains?(&1, "missing@example.com"))

    :ok = TestStore.advance(60 * 60)

    conn
    |> with_origin()
    |> post(~p"/api/auth/password-reset", %{email: "missing@example.com"})
    |> json_response(202)
  end

  test "client IP budget is shared across distinct request identifiers", %{conn: conn} do
    for request <- 1..10 do
      conn
      |> with_origin()
      |> post(~p"/api/auth/password-reset", %{email: "missing-#{request}@example.com"})
      |> json_response(202)
    end

    response =
      conn
      |> with_origin()
      |> post(~p"/api/auth/password-reset", %{email: "another-missing@example.com"})
      |> json_response(429)

    assert response["errors"]["code"] == "rate_limited"
  end

  test "store failures stop authentication work with a stable safe error", %{conn: conn} do
    :ok = TestStore.set_available(false)

    response =
      conn
      |> post(~p"/api/auth/signup", %{email: "owner@example.com"})
      |> json_response(503)

    assert response["errors"] == %{
             "code" => "rate_limiter_unavailable",
             "detail" => "Authentication is temporarily unavailable."
           }

    refute_receive {:verification_email, _email, _url}
  end

  test "forwarded IPs are accepted only from the configured trusted proxy" do
    trusted_conn = %{
      build_conn()
      | remote_ip: {10, 0, 0, 8},
        req_headers: [{"x-forwarded-for", "198.51.100.10, 10.0.0.7"}]
    }

    untrusted_conn = %{trusted_conn | remote_ip: {203, 0, 113, 9}}

    assert ClientIp.resolve(trusted_conn) == {198, 51, 100, 10}
    assert ClientIp.resolve(untrusted_conn) == {203, 0, 113, 9}
  end

  defp with_origin(conn), do: put_req_header(conn, "origin", @origin)
end
