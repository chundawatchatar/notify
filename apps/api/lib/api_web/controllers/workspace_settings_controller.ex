defmodule ApiWeb.WorkspaceSettingsController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Api.Workspaces
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission
  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse}

  alias NotifyOpenApi.WorkspaceSchemas.{
    UpdateWorkspaceSettingsRequest,
    WorkspaceSettingsResponse
  }

  plug RequirePermission, :view_workspace when action == :show
  plug RequirePermission, :manage_workspace when action == :update

  tags ["workspace settings"]

  @workspace_slug_parameter [
    workspaceSlug: [
      in: :path,
      description: "Workspace slug",
      schema: %OpenApiSpex.Schema{
        type: :string,
        minLength: 1,
        maxLength: 50,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
      }
    ]
  ]

  operation :show,
    summary: "Get settings for the active workspace",
    operation_id: "getWorkspaceSettings",
    security: [%{"bearerAuth" => []}],
    parameters: @workspace_slug_parameter,
    responses: [
      ok: {"Workspace settings", "application/json", WorkspaceSettingsResponse},
      not_found: {"Workspace unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def show(conn, %{"workspaceSlug" => workspace_slug}) do
    case Workspaces.get_workspace_settings(conn.assigns.current_membership, workspace_slug) do
      {:ok, workspace} -> json(conn, settings_response(workspace))
      {:error, :forbidden} -> forbidden(conn)
      {:error, :not_found} -> workspace_not_found(conn)
    end
  end

  operation :update,
    summary: "Update settings for the active workspace",
    operation_id: "updateWorkspaceSettings",
    security: [%{"bearerAuth" => []}],
    parameters: @workspace_slug_parameter,
    request_body:
      {"Editable workspace settings", "application/json", UpdateWorkspaceSettingsRequest,
       required: true},
    responses: [
      ok: {"Updated workspace settings", "application/json", WorkspaceSettingsResponse},
      not_found: {"Workspace unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def update(conn, %{"workspaceSlug" => workspace_slug} = params) do
    attrs = Map.delete(params, "workspaceSlug")

    case Workspaces.update_workspace_settings(
           conn.assigns.current_membership,
           workspace_slug,
           attrs
         ) do
      {:ok, workspace} -> json(conn, settings_response(workspace))
      {:error, :forbidden} -> forbidden(conn)
      {:error, :not_found} -> workspace_not_found(conn)
      {:error, %Ecto.Changeset{} = changeset} -> AuthError.validation(conn, changeset)
    end
  end

  defp settings_response(workspace) do
    %{
      settings: %{
        name: workspace.name,
        slug: workspace.slug,
        timezone: workspace.timezone,
        default_environment: "development"
      }
    }
  end

  defp workspace_not_found(conn) do
    AuthError.render(conn, :not_found, "workspace_not_found", "Workspace is unavailable.")
  end

  defp forbidden(conn) do
    AuthError.render(conn, :forbidden, "forbidden", "Permission denied.")
  end
end
