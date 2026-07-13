defmodule ApiWeb.Plugs.RequireAllowedOrigin do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    allowed_origins = Application.fetch_env!(:api, :cors_origins)

    case get_req_header(conn, "origin") do
      [origin] -> if origin in allowed_origins, do: conn, else: forbidden(conn)
      _other -> forbidden(conn)
    end
  end

  defp forbidden(conn) do
    body =
      Jason.encode!(%{
        errors: %{code: "origin_not_allowed", detail: "Request origin is not allowed."}
      })

    conn
    |> put_resp_header("content-type", "application/json; charset=utf-8")
    |> send_resp(:forbidden, body)
    |> halt()
  end
end
