defmodule ApiWeb.Routes.AuthRoutes do
  @moduledoc false

  defmacro public_auth_routes do
    quote do
      post "/auth/signup", AuthController, :signup
      post "/auth/signup/complete", AuthController, :complete_signup
      post "/auth/invitations/resolve", AuthController, :resolve_invitation
      post "/auth/invitations/signup", AuthController, :complete_invitation_signup
      post "/auth/email-verification/resend", AuthController, :resend_verification
      post "/auth/email-verification/confirm", AuthController, :confirm_email
      post "/auth/password-reset", AuthController, :request_password_reset
      post "/auth/password-reset/confirm", AuthController, :confirm_password_reset
      post "/auth/password-reset/complete", AuthController, :complete_password_reset
      post "/auth/login", AuthController, :login
      post "/auth/refresh", AuthController, :refresh
      delete "/auth/session", AuthController, :delete_session
    end
  end

  defmacro authenticated_auth_routes do
    quote do
      get "/auth/me", AuthController, :me
      get "/workspaces", AuthController, :list_workspaces
      post "/auth/invitations/accept", AuthController, :accept_invitation
      post "/auth/workspace/switch", AuthController, :switch_workspace
    end
  end
end
