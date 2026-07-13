defmodule ApiWeb.Plugs.Authenticate do
  import Plug.Conn

  alias Api.Accounts

  def init(opts), do: opts

  def call(conn, opts) do
    required? = Keyword.get(opts, :required, true)

    with {:ok, token} <- bearer_token(conn),
         {:ok, principal} <- Accounts.verify_access_token(token) do
      conn
      |> assign(:current_user, principal.user)
      |> assign(:current_workspace, principal.workspace)
      |> assign(:current_membership, principal.membership)
      |> assign(:current_session, principal.session)
    else
      _invalid when required? -> unauthorized(conn)
      _invalid -> conn
    end
  end

  defp bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] when byte_size(token) > 0 -> {:ok, token}
      _other -> {:error, :missing_bearer_token}
    end
  end

  defp unauthorized(conn) do
    body =
      Jason.encode!(%{
        errors: %{code: "invalid_access_token", detail: "Access token is invalid or expired."}
      })

    conn
    |> put_resp_header("content-type", "application/json; charset=utf-8")
    |> put_resp_header("www-authenticate", "Bearer")
    |> send_resp(:unauthorized, body)
    |> halt()
  end
end
