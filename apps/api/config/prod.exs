import Config

config :api, verification_email_adapter: Api.Accounts.VerificationEmail.DisabledAdapter

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
