defmodule ApiWeb.VersionController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias NotifyOpenApi.Schemas.VersionResponse

  tags ["system"]

  operation :show,
    summary: "Read API version",
    operation_id: "getApiVersion",
    description: "Returns the API service name and application version.",
    responses: [
      ok: {"Version response", "application/json", VersionResponse}
    ]

  def show(conn, _params) do
    json(conn, %{
      name: "notify-api",
      version: app_version()
    })
  end

  defp app_version do
    :api
    |> Application.spec(:vsn)
    |> to_string()
  end
end
