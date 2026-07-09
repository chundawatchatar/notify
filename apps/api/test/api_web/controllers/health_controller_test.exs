defmodule ApiWeb.HealthControllerTest do
  use ApiWeb.ConnCase, async: true

  test "GET /api/health returns service info and readiness checks", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/health")
      |> json_response(200)

    assert response["status"] == "ok"

    assert response["service"] == %{
             "name" => "notify-api",
             "version" => "0.1.0",
             "environment" => "test"
           }

    assert response["checks"] == %{
             "database" => %{
               "ready" => true
             }
           }
  end
end
