defmodule ApiWeb.HealthControllerTest do
  use ApiWeb.ConnCase, async: true

  test "GET /api/health/live returns process liveness", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/health/live")
      |> json_response(200)

    assert response["status"] == "ok"

    assert response["service"] == %{
             "name" => "notify-api",
             "version" => "0.1.0",
             "environment" => "test"
           }

    refute Map.has_key?(response, "checks")
  end

  test "GET /api/health/ready returns dependency readiness", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/health/ready")
      |> json_response(200)

    assert response["status"] == "ok"

    assert response["checks"] == %{
             "database" => %{
               "ready" => true
             }
           }
  end
end
