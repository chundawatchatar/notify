defmodule ApiWeb.NotificationAppController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.NotificationApps
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission
  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse}

  alias NotifyOpenApi.NotificationAppSchemas.{
    CreateNotificationAppRequest,
    NotificationApp,
    NotificationAppsResponse
  }

  plug RequirePermission, :view_apps when action in [:index, :show]
  plug RequirePermission, :create_apps when action == :create

  tags ["notification apps"]

  operation :index,
    summary: "List notification apps in the active workspace",
    operation_id: "listNotificationApps",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Notification apps", "application/json", NotificationAppsResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def index(conn, _params) do
    apps =
      conn.assigns.current_workspace
      |> NotificationApps.list_notification_apps()
      |> Enum.map(&app_payload/1)

    json(conn, %{apps: apps})
  end

  operation :create,
    summary: "Create a notification app in the active workspace",
    operation_id: "createNotificationApp",
    security: [%{"bearerAuth" => []}],
    request_body:
      {"Notification app details", "application/json", CreateNotificationAppRequest,
       required: true},
    responses: [
      created: {"Created notification app", "application/json", NotificationApp},
      conflict: {"App slug unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def create(conn, params) do
    case NotificationApps.create_notification_app(conn.assigns.current_workspace, params) do
      {:ok, notification_app} ->
        conn
        |> put_status(:created)
        |> json(app_payload(notification_app))

      {:error, %Ecto.Changeset{} = changeset} ->
        if app_slug_conflict?(changeset) do
          AuthError.render(
            conn,
            :conflict,
            "app_slug_taken",
            "An app with this slug already exists in this workspace."
          )
        else
          AuthError.validation(conn, changeset)
        end

      {:error, reason} ->
        app_creation_failed(conn, reason)

      {:error, operation, reason} ->
        app_creation_failed(conn, {operation, reason})
    end
  end

  operation :show,
    summary: "Get a notification app in the active workspace",
    operation_id: "getNotificationApp",
    security: [%{"bearerAuth" => []}],
    parameters: [appSlug: [in: :path, description: "Notification app slug", type: :string]],
    responses: [
      ok: {"Notification app", "application/json", NotificationApp},
      not_found: {"App unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def show(conn, %{"appSlug" => app_slug}) do
    case NotificationApps.get_notification_app_by_slug(conn.assigns.current_workspace, app_slug) do
      nil -> app_not_found(conn)
      notification_app -> json(conn, app_payload(notification_app))
    end
  end

  defp app_payload(notification_app) do
    %{
      id: notification_app.id,
      name: notification_app.name,
      slug: notification_app.app_slug,
      environments:
        notification_app.environments
        |> Enum.sort_by(& &1.environment_slug)
        |> Enum.map(&environment_payload/1)
    }
  end

  defp environment_payload(environment) do
    %{
      id: environment.id,
      name: environment.name,
      slug: environment.environment_slug,
      production: environment.production
    }
  end

  defp app_slug_conflict?(changeset) do
    Enum.any?(changeset.errors, fn
      {:app_slug, {_message, options}} -> options[:constraint] == :unique
      _error -> false
    end)
  end

  defp app_not_found(conn) do
    AuthError.render(conn, :not_found, "app_not_found", "Notification app is unavailable.")
  end

  defp app_creation_failed(conn, reason) do
    Logger.error("Notification app creation failed: #{inspect(reason)}")

    AuthError.render(
      conn,
      :internal_server_error,
      "app_creation_failed",
      "Notification app creation is temporarily unavailable."
    )
  end
end
