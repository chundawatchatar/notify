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
    assert Map.has_key?(response["paths"], "/api/auth/password-reset")
    assert Map.has_key?(response["paths"], "/api/auth/password-reset/confirm")
    assert Map.has_key?(response["paths"], "/api/auth/password-reset/complete")
    assert Map.has_key?(response["paths"], "/api/auth/login")
    assert Map.has_key?(response["paths"], "/api/auth/refresh")
    assert Map.has_key?(response["paths"], "/api/auth/me")
    assert Map.has_key?(response["paths"], "/api/auth/session")
    assert Map.has_key?(response["paths"], "/api/workspaces")
    assert Map.has_key?(response["paths"], "/api/auth/workspace/switch")
    assert Map.has_key?(response["paths"], "/api/apps")
    assert Map.has_key?(response["paths"], "/api/apps/{appSlug}")

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

    assert response["paths"]["/api/workspaces"]["get"]["operationId"] == "listWorkspaces"

    assert response["paths"]["/api/auth/workspace/switch"]["post"]["operationId"] ==
             "switchWorkspace"

    assert response["paths"]["/api/apps"]["get"]["operationId"] == "listNotificationApps"
    assert response["paths"]["/api/apps"]["post"]["operationId"] == "createNotificationApp"

    assert response["paths"]["/api/apps/{appSlug}"]["get"]["operationId"] ==
             "getNotificationApp"

    assert response["paths"]["/api/apps/{appSlug}"]["patch"]["operationId"] ==
             "updateNotificationApp"

    assert response["paths"]["/api/apps/{appSlug}"]["delete"]["operationId"] ==
             "archiveNotificationApp"

    assert response["paths"]["/api/apps"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/NotificationAppsResponse"

    assert response["paths"]["/api/apps"]["post"]["responses"]["201"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/NotificationApp"

    assert response["paths"]["/api/apps/{appSlug}"]["get"]["responses"]["200"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/NotificationApp"

    assert response["paths"]["/api/apps/{appSlug}"]["patch"]["requestBody"]["content"][
             "application/json"
           ]["schema"]["$ref"] == "#/components/schemas/UpdateNotificationAppRequest"

    assert response["components"]["schemas"]["NotificationApp"]["properties"]["slug"] == %{
             "example" => "payments-service",
             "maxLength" => 50,
             "minLength" => 1,
             "pattern" => "^[a-z0-9]+(?:-[a-z0-9]+)*$",
             "type" => "string"
           }

    assert response["paths"]["/api/apps/{appSlug}"]["get"]["parameters"] == [
             %{
               "description" => "Notification app slug",
               "in" => "path",
               "name" => "appSlug",
               "required" => true,
               "schema" => %{
                 "maxLength" => 50,
                 "minLength" => 1,
                 "pattern" => "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 "type" => "string"
               }
             }
           ]

    assert response["components"]["schemas"]["AuthWorkspaceRole"]["enum"] == [
             "owner",
             "admin",
             "developer",
             "viewer"
           ]

    assert response["paths"]["/api/auth/email-verification/confirm"]["post"]["responses"][
             "200"
           ]["content"]["application/json"]["schema"]["$ref"] ==
             "#/components/schemas/SignupTokenResponse"

    assert response["paths"]["/api/auth/password-reset/confirm"]["post"]["responses"]["200"][
             "content"
           ]["application/json"]["schema"]["$ref"] ==
             "#/components/schemas/PasswordResetTokenResponse"
  end
end
