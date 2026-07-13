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
    assert Map.has_key?(response["paths"], "/api/auth/signup")
    assert Map.has_key?(response["paths"], "/api/auth/signup/complete")
    assert Map.has_key?(response["paths"], "/api/auth/email-verification/resend")
    assert Map.has_key?(response["paths"], "/api/auth/email-verification/confirm")
    assert Map.has_key?(response["paths"], "/api/auth/login")
    assert Map.has_key?(response["paths"], "/api/auth/refresh")
    assert Map.has_key?(response["paths"], "/api/auth/me")
    assert Map.has_key?(response["paths"], "/api/auth/session")

    assert response["components"]["securitySchemes"]["bearerAuth"] == %{
             "bearerFormat" => "JWT",
             "description" => "Short-lived Notify dashboard access token.",
             "scheme" => "bearer",
             "type" => "http"
           }

    assert response["paths"]["/api/health/live"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/LivenessResponse"

    assert response["paths"]["/api/health/ready"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/ReadinessResponse"

    assert response["paths"]["/api/version"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/VersionResponse"

    assert response["paths"]["/api/auth/login"]["post"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/AuthResponse"

    assert response["paths"]["/api/auth/login"]["post"]["responses"]["200"]["headers"][
             "Set-Cookie"
           ]["description"] == "Rotating HttpOnly refresh-token cookie"

    assert response["paths"]["/api/auth/me"]["get"]["security"] == [
             %{"bearerAuth" => []}
           ]

    assert response["paths"]["/api/auth/email-verification/confirm"]["post"]["responses"][
             "200"
           ]["content"]["application/json"]["schema"]["$ref"] ==
             "#/components/schemas/SignupTokenResponse"
  end
end
