defmodule ApiWeb.OpenApiControllerTest do
  use ApiWeb.ConnCase, async: true

  test "GET /api/openapi returns the OpenAPI contract", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/openapi")
      |> json_response(200)

    assert response["openapi"] == "3.0.0"
    assert response["info"]["title"] == "Notify API"

    assert Map.has_key?(response["paths"], "/api/health")
    assert Map.has_key?(response["paths"], "/api/version")

    assert response["paths"]["/api/health"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/HealthResponse"

    assert response["paths"]["/api/version"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/VersionResponse"
  end
end
