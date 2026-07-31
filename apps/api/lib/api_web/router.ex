defmodule ApiWeb.Router do
  use ApiWeb, :router

  import ApiWeb.Routes.AuthRoutes
  import ApiWeb.Routes.NotificationAppRoutes
  import ApiWeb.Routes.WorkspaceRoutes

  pipeline :api do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: ApiWeb.OpenApi.ApiSpec
  end

  pipeline :authenticated_api do
    plug ApiWeb.Plugs.Authenticate
  end

  scope "/api", ApiWeb do
    pipe_through :api

    get "/health/live", HealthController, :live
    get "/health/ready", HealthController, :ready
    get "/version", VersionController, :show

    public_auth_routes()
  end

  scope "/api", ApiWeb do
    pipe_through [:api, :authenticated_api]

    authenticated_auth_routes()
    notification_app_routes()
    environment_configuration_routes()
    workspace_member_routes()
  end

  scope "/api" do
    pipe_through :api

    get "/openapi", OpenApiSpex.Plug.RenderSpec, []
  end

  get "/metrics", ApiWeb.MetricsController, :show
end
