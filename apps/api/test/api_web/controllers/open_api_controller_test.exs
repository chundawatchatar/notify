defmodule ApiWeb.OpenApiControllerTest do
  use ApiWeb.ConnCase, async: true

  test "GET /api/openapi returns the OpenAPI contract", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/openapi")
      |> json_response(200)

    assert response["openapi"] == "3.0.0"
    assert response["info"]["title"] == "Notify API"

    assert Map.has_key?(response["paths"], "/api/health/live")
    assert Map.has_key?(response["paths"], "/api/health/ready")
    assert Map.has_key?(response["paths"], "/api/version")

    assert response["paths"]["/api/health/live"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/LivenessResponse"

    assert response["paths"]["/api/health/ready"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/ReadinessResponse"

    assert response["paths"]["/api/version"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/VersionResponse"
  end
end
