defmodule ApiWeb.OpenApi.ApiSpec do
  @behaviour OpenApiSpex.OpenApi

  alias ApiWeb.Endpoint
  alias ApiWeb.Router
  alias OpenApiSpex.{Components, Info, OpenApi, Paths, SecurityScheme, Server}

  @impl OpenApiSpex.OpenApi
  def spec do
    %OpenApi{
      servers: [
        %Server{url: endpoint_url()}
      ],
      info: %Info{
        title: "Notify API",
        version: app_version()
      },
      components: %Components{
        securitySchemes: %{
          "bearerAuth" => %SecurityScheme{
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Short-lived Notify dashboard access token."
          }
        }
      },
      paths: Paths.from_router(Router)
    }
    |> OpenApiSpex.resolve_schema_modules()
  end

  defp endpoint_url do
    Endpoint.url()
  rescue
    _error -> "http://localhost:4100"
  end

  defp app_version do
    :api
    |> Application.spec(:vsn)
    |> to_string()
  end
end
