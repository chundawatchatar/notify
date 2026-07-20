defmodule ApiWeb.AuthController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.Accounts
  alias ApiWeb.AuthError

  alias NotifyOpenApi.AuthSchemas.{
    AuthResponse,
    CompletePasswordResetRequest,
    CompleteSignupRequest,
    ConfirmEmailRequest,
    ConfirmPasswordResetRequest,
    ErrorResponse,
    LoginRequest,
    MeResponse,
    PasswordResetCompletionResponse,
    PasswordResetRequest,
    PasswordResetRequestResponse,
    PasswordResetTokenResponse,
    ResendVerificationRequest,
    SignupCompletionResponse,
    SignupRequest,
    SignupTokenResponse,
    StatusResponse,
    ValidationErrorResponse
  }

  alias OpenApiSpex.{Header, Schema}

  @refresh_cookie "_notify_refresh"
  @refresh_cookie_path "/api/auth"

  plug ApiWeb.Plugs.RequireAllowedOrigin
       when action in [
              :login,
              :request_password_reset,
              :confirm_password_reset,
              :complete_password_reset,
              :refresh,
              :delete_session
            ]

  plug ApiWeb.Plugs.Authenticate, [required: false] when action == :delete_session

  tags ["authentication"]

  operation :signup,
    summary: "Start email-first signup",
    operation_id: "signup",
    request_body: {"Signup email", "application/json", SignupRequest, required: true},
    responses: [
      accepted: {"Verification request accepted", "application/json", StatusResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse},
      service_unavailable: {"Verification delivery failed", "application/json", ErrorResponse}
    ]

  def signup(conn, %{"email" => email}) do
    case Accounts.request_signup(email) do
      :ok ->
        conn
        |> put_status(:accepted)
        |> json(%{status: "verification_sent"})

      {:error, :challenge, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)

      {:error, :delivery_failed} ->
        Logger.error("Signup verification email delivery failed")

        AuthError.render(
          conn,
          :service_unavailable,
          "verification_delivery_failed",
          "Verification email delivery is temporarily unavailable."
        )
    end
  end

  def signup(conn, _params) do
    AuthError.render(
      conn,
      :unprocessable_entity,
      "validation_failed",
      "Request validation failed.",
      %{email: ["is required"]}
    )
  end

  operation :resend_verification,
    summary: "Resend email verification instructions",
    operation_id: "resendEmailVerification",
    request_body:
      {"Email verification request", "application/json", ResendVerificationRequest,
       required: true},
    responses: [
      accepted: {"Verification request accepted", "application/json", StatusResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse},
      service_unavailable: {"Verification delivery failed", "application/json", ErrorResponse}
    ]

  def resend_verification(conn, %{"email" => email})
      when is_binary(email) and byte_size(email) > 0 do
    case Accounts.resend_verification(email) do
      :ok ->
        conn
        |> put_status(:accepted)
        |> json(%{status: "verification_sent"})

      {:error, :delivery_failed} ->
        Logger.error("Verification email redelivery failed")

        AuthError.render(
          conn,
          :service_unavailable,
          "verification_delivery_failed",
          "Verification email delivery is temporarily unavailable."
        )

      {:error, :challenge, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)
    end
  end

  def resend_verification(conn, _params) do
    AuthError.render(
      conn,
      :unprocessable_entity,
      "validation_failed",
      "Request validation failed.",
      %{email: ["is required"]}
    )
  end

  operation :confirm_email,
    summary: "Confirm an account email",
    operation_id: "confirmEmail",
    request_body:
      {"Email verification token", "application/json", ConfirmEmailRequest, required: true},
    responses: [
      ok: {"Email verified for signup completion", "application/json", SignupTokenResponse},
      bad_request: {"Token invalid or expired", "application/json", ErrorResponse}
    ]

  def confirm_email(conn, %{"token" => token}) do
    case Accounts.confirm_email(token) do
      {:ok, result} ->
        json(conn, %{signup_token: result.signup_token, expires_in: result.expires_in})

      {:error, :invalid_or_expired_token} ->
        AuthError.render(
          conn,
          :bad_request,
          "invalid_verification_token",
          "Verification token is invalid or expired."
        )
    end
  end

  def confirm_email(conn, _params) do
    AuthError.render(
      conn,
      :bad_request,
      "invalid_verification_token",
      "Verification token is invalid or expired."
    )
  end

  operation :complete_signup,
    summary: "Complete a verified signup",
    operation_id: "completeSignup",
    request_body:
      {"Verified signup details", "application/json", CompleteSignupRequest, required: true},
    responses: [
      created:
        {"Account and owner workspace created", "application/json", SignupCompletionResponse},
      bad_request: {"Signup token invalid or expired", "application/json", ErrorResponse},
      conflict: {"Email already registered", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def complete_signup(conn, params) do
    case Accounts.complete_signup(params) do
      {:ok, _registration} ->
        conn
        |> put_status(:created)
        |> json(%{status: "account_created"})

      {:error, :invalid_or_expired_signup_token} ->
        AuthError.render(
          conn,
          :bad_request,
          "invalid_signup_token",
          "Signup token is invalid or expired."
        )

      {:error, :user, changeset} ->
        if unique_email_error?(changeset) do
          AuthError.render(
            conn,
            :conflict,
            "email_taken",
            "An account with this email already exists."
          )
        else
          AuthError.validation(conn, changeset)
        end

      {:error, :workspace, changeset} ->
        AuthError.validation(conn, changeset, %{name: :workspace_name})

      {:error, _operation, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)
    end
  end

  operation :request_password_reset,
    summary: "Request password reset instructions",
    operation_id: "requestPasswordReset",
    request_body:
      {"Password reset email", "application/json", PasswordResetRequest, required: true},
    responses: [
      accepted:
        {"Password reset request accepted", "application/json", PasswordResetRequestResponse},
      forbidden: {"Origin rejected", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def request_password_reset(conn, %{"email" => email})
      when is_binary(email) and byte_size(email) > 0 and byte_size(email) <= 160 do
    :ok = Accounts.request_password_reset(email)

    conn
    |> put_status(:accepted)
    |> json(%{status: "password_reset_requested"})
  end

  def request_password_reset(conn, _params) do
    AuthError.render(
      conn,
      :unprocessable_entity,
      "validation_failed",
      "Request validation failed.",
      %{email: ["is required and must be at most 160 characters"]}
    )
  end

  operation :confirm_password_reset,
    summary: "Confirm a password reset link",
    operation_id: "confirmPasswordReset",
    request_body:
      {"Password reset token", "application/json", ConfirmPasswordResetRequest, required: true},
    responses: [
      ok: {"Password reset confirmed", "application/json", PasswordResetTokenResponse},
      bad_request: {"Token invalid or expired", "application/json", ErrorResponse},
      forbidden: {"Origin rejected", "application/json", ErrorResponse}
    ]

  def confirm_password_reset(conn, %{"token" => token}) do
    case Accounts.confirm_password_reset(token) do
      {:ok, result} ->
        json(conn, %{reset_token: result.reset_token, expires_in: result.expires_in})

      {:error, :invalid_or_expired_token} ->
        invalid_password_reset_token(conn)
    end
  end

  def confirm_password_reset(conn, _params), do: invalid_password_reset_token(conn)

  operation :complete_password_reset,
    summary: "Set a new password",
    operation_id: "completePasswordReset",
    request_body:
      {"New password", "application/json", CompletePasswordResetRequest, required: true},
    responses: [
      ok: {"Password reset", "application/json", PasswordResetCompletionResponse},
      bad_request: {"Reset token invalid or expired", "application/json", ErrorResponse},
      forbidden: {"Origin rejected", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def complete_password_reset(conn, params) do
    case Accounts.complete_password_reset(params) do
      {:ok, _result} ->
        json(conn, %{status: "password_reset"})

      {:error, :invalid_or_expired_reset_token} ->
        invalid_password_reset_token(conn)

      {:error, :user, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)

      {:error, _operation, %Ecto.Changeset{} = changeset} ->
        AuthError.validation(conn, changeset)
    end
  end

  operation :login,
    summary: "Sign in with email and password",
    operation_id: "login",
    request_body: {"Login credentials", "application/json", LoginRequest, required: true},
    responses: [
      ok:
        {"Authenticated session", "application/json", AuthResponse,
         headers: %{
           "Set-Cookie" => %Header{
             description: "Rotating HttpOnly refresh-token cookie",
             schema: %Schema{type: :string}
           }
         }},
      unauthorized: {"Credentials invalid", "application/json", ErrorResponse},
      forbidden: {"Email not verified or origin rejected", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def login(conn, params) do
    email = params["email"]
    password = params["password"]
    remember = params["remember"] == true

    if valid_login_request?(email, password, params["remember"]) do
      perform_login(conn, email, password, remember)
    else
      AuthError.render(
        conn,
        :unprocessable_entity,
        "validation_failed",
        "Request validation failed.",
        login_validation_fields(email, password, params["remember"])
      )
    end
  end

  defp perform_login(conn, email, password, remember) do
    case Accounts.login(email, password, remember) do
      {:ok, result} ->
        conn
        |> put_refresh_cookie(result)
        |> json(auth_payload(result))

      {:error, :invalid_credentials} ->
        AuthError.render(
          conn,
          :unauthorized,
          "invalid_credentials",
          "Email or password is invalid."
        )

      {:error, :email_not_verified} ->
        AuthError.render(
          conn,
          :forbidden,
          "email_not_verified",
          "Email verification is required."
        )

      {:error, :workspace_membership_not_found} ->
        Logger.error("Verified user has no workspace membership")

        AuthError.render(
          conn,
          :unauthorized,
          "invalid_credentials",
          "Email or password is invalid."
        )
    end
  end

  operation :refresh,
    summary: "Rotate a refresh credential",
    operation_id: "refreshSession",
    responses: [
      ok:
        {"Refreshed session", "application/json", AuthResponse,
         headers: %{
           "Set-Cookie" => %Header{
             description: "Rotated HttpOnly refresh-token cookie",
             schema: %Schema{type: :string}
           }
         }},
      unauthorized: {"Refresh credential invalid", "application/json", ErrorResponse},
      forbidden: {"Origin rejected", "application/json", ErrorResponse}
    ]

  def refresh(conn, _params) do
    conn = fetch_cookies(conn)

    case Accounts.refresh_session(conn.req_cookies[@refresh_cookie]) do
      {:ok, result} ->
        conn
        |> put_refresh_cookie(result)
        |> json(auth_payload(result))

      {:error, :invalid_refresh_token} ->
        conn
        |> clear_refresh_cookie()
        |> AuthError.render(
          :unauthorized,
          "invalid_refresh_token",
          "Refresh credential is invalid or expired."
        )
    end
  end

  operation :me,
    summary: "Read the authenticated account and workspace",
    operation_id: "getCurrentUser",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Authenticated principal", "application/json", MeResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse}
    ]

  def me(conn, _params) do
    json(conn, principal_payload(conn))
  end

  operation :delete_session,
    summary: "Sign out and revoke the current session",
    operation_id: "logout",
    security: [%{}, %{"bearerAuth" => []}],
    responses: [
      no_content: "Session revoked",
      forbidden: {"Origin rejected", "application/json", ErrorResponse}
    ]

  def delete_session(conn, _params) do
    conn = fetch_cookies(conn)

    case conn.assigns[:current_session] do
      nil -> Accounts.revoke_session_by_refresh(conn.req_cookies[@refresh_cookie])
      session -> Accounts.revoke_session(session)
    end

    conn
    |> clear_refresh_cookie()
    |> send_resp(:no_content, "")
  end

  defp auth_payload(result) do
    result
    |> principal_payload()
    |> Map.merge(%{
      access_token: result.access_token,
      expires_in: result.expires_in,
      token_type: "Bearer"
    })
  end

  defp principal_payload(%Plug.Conn{} = conn) do
    principal_payload(%{
      user: conn.assigns.current_user,
      workspace: conn.assigns.current_workspace,
      membership: conn.assigns.current_membership
    })
  end

  defp principal_payload(result) do
    %{
      user: %{id: result.user.id, email: result.user.email},
      workspace: %{
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug
      },
      role: result.membership.role
    }
  end

  defp put_refresh_cookie(conn, result) do
    max_age = max(DateTime.diff(result.session.expires_at, DateTime.utc_now(:second)), 0)

    put_resp_cookie(conn, @refresh_cookie, result.refresh_token,
      http_only: true,
      max_age: max_age,
      path: @refresh_cookie_path,
      same_site: "Lax",
      secure: secure_cookies?()
    )
  end

  defp clear_refresh_cookie(conn) do
    delete_resp_cookie(conn, @refresh_cookie,
      http_only: true,
      path: @refresh_cookie_path,
      same_site: "Lax",
      secure: secure_cookies?()
    )
  end

  defp secure_cookies? do
    Application.fetch_env!(:api, :environment) == :prod
  end

  defp invalid_password_reset_token(conn) do
    AuthError.render(
      conn,
      :bad_request,
      "invalid_password_reset_token",
      "Password reset token is invalid or expired."
    )
  end

  defp unique_email_error?(changeset) do
    Enum.any?(changeset.errors, fn
      {:email, {_message, opts}} -> opts[:constraint] == :unique
      _other -> false
    end)
  end

  defp valid_login_request?(email, password, remember) do
    is_binary(email) and byte_size(email) > 0 and is_binary(password) and
      byte_size(password) > 0 and (is_nil(remember) or is_boolean(remember))
  end

  defp login_validation_fields(email, password, remember) do
    %{}
    |> maybe_add_field_error(:email, not is_binary(email) or byte_size(email) == 0, "is required")
    |> maybe_add_field_error(
      :password,
      not is_binary(password) or byte_size(password) == 0,
      "is required"
    )
    |> maybe_add_field_error(
      :remember,
      not is_nil(remember) and not is_boolean(remember),
      "must be a boolean"
    )
  end

  defp maybe_add_field_error(fields, _field, false, _message), do: fields
  defp maybe_add_field_error(fields, field, true, message), do: Map.put(fields, field, [message])
end
