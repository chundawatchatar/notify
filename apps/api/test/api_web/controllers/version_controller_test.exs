defmodule ApiWeb.VersionControllerTest do
  use ApiWeb.ConnCase, async: true

  test "GET /api/version returns the API version", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/version")
      |> json_response(200)

    assert response == %{
             "name" => "notify-api",
             "version" => "0.1.0"
           }
  end
end
