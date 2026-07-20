defmodule ApiWeb.Plugs.RequirePermission do
  @moduledoc """
  Requires a named workspace permission from the database-backed membership.
  """

  import Plug.Conn

  alias Domain.WorkspacePermissions

  def init(action), do: action

  def call(conn, action) do
    case conn.assigns[:current_membership] do
      %{role: role} when is_binary(role) ->
        if WorkspacePermissions.allowed?(role, action), do: conn, else: forbidden(conn)

      _missing_membership ->
        forbidden(conn)
    end
  end

  defp forbidden(conn) do
    body = Jason.encode!(%{errors: %{code: "forbidden", detail: "Permission denied."}})

    conn
    |> put_resp_header("content-type", "application/json; charset=utf-8")
    |> send_resp(:forbidden, body)
    |> halt()
  end
end
