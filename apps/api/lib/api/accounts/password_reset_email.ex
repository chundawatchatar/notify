defmodule Api.Accounts.PasswordResetEmail do
  @callback deliver(String.t(), String.t()) :: :ok | {:error, term()}

  def deliver(email, token) when is_binary(email) do
    url = reset_url(token)
    adapter().deliver(email, url)
  end

  defp reset_url(token) do
    base_url = Application.fetch_env!(:api, :web_app_url)
    base_url <> "/auth/forgot-password?token=" <> URI.encode_www_form(token)
  end

  defp adapter do
    Application.fetch_env!(:api, :password_reset_email_adapter)
  end
end

defmodule Api.Accounts.PasswordResetEmail.DevAdapter do
  @behaviour Api.Accounts.PasswordResetEmail

  @impl true
  def deliver(email, url) do
    Api.Accounts.DevelopmentEmail.deliver(
      email,
      "Reset your Notify password",
      """
      Use this link to reset your Notify password:

      #{url}

      This link expires in one hour and can be used once.
      If you did not request a password reset, you can ignore this email.
      """
    )
  end
end

defmodule Api.Accounts.PasswordResetEmail.TestAdapter do
  @behaviour Api.Accounts.PasswordResetEmail

  @impl true
  def deliver(email, url) do
    send(self(), {:password_reset_email, email, url})
    :ok
  end
end

defmodule Api.Accounts.PasswordResetEmail.DisabledAdapter do
  @behaviour Api.Accounts.PasswordResetEmail

  @impl true
  def deliver(_email, _url), do: {:error, :adapter_not_configured}
end
