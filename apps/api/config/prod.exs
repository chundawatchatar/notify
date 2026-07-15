import Config

config :api,
  password_reset_email_adapter: Api.Accounts.PasswordResetEmail.DisabledAdapter,
  verification_email_adapter: Api.Accounts.VerificationEmail.DisabledAdapter

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
