defmodule ApiWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :api

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    plug Phoenix.CodeReloader
    plug Phoenix.Ecto.CheckRepoStatus, otp_app: :api
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug CORSPlug, origin: &__MODULE__.cors_origins/0, credentials: true
  plug ApiWeb.Router

  def cors_origins do
    Application.fetch_env!(:api, :cors_origins)
  end
end
