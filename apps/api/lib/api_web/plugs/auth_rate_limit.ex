defmodule ApiWeb.Plugs.AuthRateLimit do
  @moduledoc false

  @behaviour Plug

  import Plug.Conn

  require Logger

  alias Api.Accounts.User
  alias Api.AuthRateLimiter
  alias Api.AuthRateLimiter.ClientIp
  alias ApiWeb.AuthError

  @email_dispatch_actions [:signup, :resend_verification, :request_password_reset]

  @credential_params %{
    complete_signup: "signup_token",
    confirm_email: "token",
    confirm_password_reset: "token",
    complete_password_reset: "reset_token",
    resolve_invitation: "token",
    complete_invitation_signup: "token"
  }

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    action = conn.private.phoenix_action

    case AuthRateLimiter.check(action, identifiers(conn, action)) do
      {:ok, :allowed} ->
        conn

      {:ok, {:rate_limited, retry_after}} ->
        conn
        |> put_resp_header("retry-after", Integer.to_string(retry_after))
        |> AuthError.render(
          :too_many_requests,
          "rate_limited",
          "Too many authentication requests. Try again later."
        )
        |> halt()

      {:error, _reason} ->
        Logger.warning("Authentication rate limiter unavailable for #{action}")

        conn
        |> AuthError.render(
          :service_unavailable,
          "rate_limiter_unavailable",
          "Authentication is temporarily unavailable."
        )
        |> halt()
    end
  end

  defp identifiers(conn, action) when action in @email_dispatch_actions do
    [client_ip_identifier(conn, 10, 10 * 60)] ++
      optional_email_identifier(conn, 3, 60 * 60)
  end

  defp identifiers(conn, :login) do
    [client_ip_identifier(conn, 20, 5 * 60)] ++
      optional_email_identifier(conn, 5, 15 * 60)
  end

  defp identifiers(conn, action) when is_map_key(@credential_params, action) do
    [client_ip_identifier(conn, 30, 5 * 60)] ++
      optional_credential_identifier(conn, Map.fetch!(@credential_params, action), 5, 15 * 60)
  end

  defp identifiers(conn, :refresh) do
    [client_ip_identifier(conn, 120, 5 * 60)] ++ optional_session_identifier(conn)
  end

  defp client_ip_identifier(conn, limit, window_seconds) do
    value = conn |> ClientIp.resolve() |> :inet.ntoa() |> to_string()
    {:client_ip, value, limit, window_seconds}
  end

  defp optional_email_identifier(conn, limit, window_seconds) do
    case body_param(conn, "email") do
      email when is_binary(email) and byte_size(email) > 0 ->
        [{:email, User.normalize_email(email), limit, window_seconds}]

      _missing_or_invalid ->
        []
    end
  end

  defp optional_credential_identifier(conn, param, limit, window_seconds) do
    case body_param(conn, param) do
      credential when is_binary(credential) and byte_size(credential) > 0 ->
        [{:credential, credential, limit, window_seconds}]

      _missing_or_invalid ->
        []
    end
  end

  defp optional_session_identifier(conn) do
    conn = fetch_cookies(conn)

    with token when is_binary(token) <- conn.req_cookies["_notify_refresh"],
         [session_id, _secret] <- String.split(token, ".", parts: 2),
         {:ok, _binary_id} <- Ecto.UUID.dump(session_id) do
      [{:session, session_id, 30, 5 * 60}]
    else
      _missing_or_invalid -> []
    end
  end

  defp body_param(%Plug.Conn{body_params: %Plug.Conn.Unfetched{}}, _key), do: nil
  defp body_param(%Plug.Conn{body_params: params}, key), do: params[key]
end
