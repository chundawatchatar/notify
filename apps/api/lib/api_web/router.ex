defmodule ApiWeb.Router do
  use ApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: ApiWeb.OpenApi.ApiSpec
  end

  scope "/api", ApiWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/version", VersionController, :show
  end

  scope "/api" do
    pipe_through :api

    get "/openapi", OpenApiSpex.Plug.RenderSpec, []
  end
end
