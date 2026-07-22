defmodule ApiWeb.Router do
  use ApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: ApiWeb.OpenApi.ApiSpec
  end

  pipeline :authenticated_api do
    plug ApiWeb.Plugs.Authenticate
  end

  scope "/api", ApiWeb do
    pipe_through :api

    get "/health/live", HealthController, :live
    get "/health/ready", HealthController, :ready
    get "/version", VersionController, :show

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

  scope "/api", ApiWeb do
    pipe_through [:api, :authenticated_api]

    get "/auth/me", AuthController, :me
    get "/workspaces", AuthController, :list_workspaces
    post "/auth/invitations/accept", AuthController, :accept_invitation
    post "/auth/workspace/switch", AuthController, :switch_workspace

    get "/apps", NotificationAppController, :index
    post "/apps", NotificationAppController, :create
    get "/apps/:appSlug", NotificationAppController, :show
    patch "/apps/:appSlug", NotificationAppController, :update
    delete "/apps/:appSlug", NotificationAppController, :delete

    get "/workspaces/:workspaceSlug/members", WorkspaceMemberController, :index
    patch "/workspaces/:workspaceSlug/members/:membershipId", WorkspaceMemberController, :update
    delete "/workspaces/:workspaceSlug/members/:membershipId", WorkspaceMemberController, :delete
    get "/workspaces/:workspaceSlug/invitations", WorkspaceMemberController, :list_invitations
    post "/workspaces/:workspaceSlug/invitations", WorkspaceMemberController, :create_invitation

    delete "/workspaces/:workspaceSlug/invitations/:invitationId",
           WorkspaceMemberController,
           :revoke_invitation
  end

  scope "/api" do
    pipe_through :api

    get "/openapi", OpenApiSpex.Plug.RenderSpec, []
  end

  get "/metrics", ApiWeb.MetricsController, :show
end
