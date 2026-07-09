defmodule ApiWeb.VersionController do
  use ApiWeb, :controller

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
