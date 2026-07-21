import Config

config :api,
  invitation_email_adapter: Api.Accounts.InvitationEmail.TestAdapter,
  password_reset_email_adapter: Api.Accounts.PasswordResetEmail.TestAdapter,
  verification_email_adapter: Api.Accounts.VerificationEmail.TestAdapter

config :argon2_elixir, t_cost: 1, m_cost: 8

postgres_hostname = System.get_env("POSTGRES_HOST", "localhost")
postgres_port = System.get_env("POSTGRES_PORT", "15432")
postgres_username = System.get_env("POSTGRES_USER", "notify")
postgres_password = System.get_env("POSTGRES_PASSWORD", "notify")

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :api, Api.Repo,
  username: postgres_username,
  password: postgres_password,
  hostname: postgres_hostname,
  port: String.to_integer(postgres_port),
  database: "notify_api_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :api, ApiWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "JIxDw06NetG5Fv4Q3GcNHJ/WKO4apobUm0lNq4LtUCn/lx6Tf5MdKkaU3FTbThP4",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime
