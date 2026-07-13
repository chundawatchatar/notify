defmodule ApiWeb.AuthError do
  import Phoenix.Controller
  import Plug.Conn

  def render(conn, status, code, detail, fields \\ nil) do
    errors = %{code: code, detail: detail}
    errors = if fields in [nil, %{}], do: errors, else: Map.put(errors, :fields, fields)

    conn
    |> put_status(status)
    |> json(%{errors: errors})
  end

  def validation(conn, changeset, field_mapping \\ %{}) do
    fields =
      Ecto.Changeset.traverse_errors(changeset, fn {message, opts} ->
        Regex.replace(~r"%{(\w+)}", message, fn _, key ->
          opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
        end)
      end)
      |> Map.new(fn {field, messages} -> {Map.get(field_mapping, field, field), messages} end)

    render(conn, :unprocessable_entity, "validation_failed", "Request validation failed.", fields)
  end
end
