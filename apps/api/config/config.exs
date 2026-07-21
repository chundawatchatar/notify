# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :api,
  auth_jwt_secret: "notify-local-jwt-secret-change-before-production",
  cors_origins: ["http://localhost:3100"],
  dev_email_outbox_dir: Path.expand("../../../.tmp/dev-emails", __DIR__),
  environment: config_env(),
  ecto_repos: [Api.Repo],
  generators: [timestamp_type: :utc_datetime],
  metrics_enabled: true,
  metrics_token: nil,
  invitation_email_adapter: Api.Accounts.InvitationEmail.DevAdapter,
  password_reset_email_adapter: Api.Accounts.PasswordResetEmail.DevAdapter,
  verification_email_adapter: Api.Accounts.VerificationEmail.DevAdapter,
  web_app_url: "http://localhost:3100"

# Configures the endpoint
config :api, ApiWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: ApiWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Api.PubSub

# Configures Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
