defmodule Api.Accounts.VerificationEmail do
  @callback deliver(String.t(), String.t()) :: :ok | {:error, term()}

  def deliver(email, token) when is_binary(email) do
    url = verification_url(token)
    adapter().deliver(email, url)
  end

  defp verification_url(token) do
    base_url = Application.fetch_env!(:api, :web_app_url)
    base_url <> "/auth/verify-email?token=" <> URI.encode_www_form(token)
  end

  defp adapter do
    Application.fetch_env!(:api, :verification_email_adapter)
  end
end

defmodule Api.Accounts.VerificationEmail.DevAdapter do
  @behaviour Api.Accounts.VerificationEmail

  @impl true
  def deliver(email, url) do
    Api.Accounts.DevelopmentEmail.deliver(
      email,
      "Verify your Notify email",
      """
      Verify your email to continue creating your Notify account:

      #{url}

      This link expires in 24 hours and can be used once.
      """
    )
  end
end

defmodule Api.Accounts.VerificationEmail.TestAdapter do
  @behaviour Api.Accounts.VerificationEmail

  @impl true
  def deliver(email, url) do
    send(self(), {:verification_email, email, url})
    :ok
  end
end

defmodule Api.Accounts.VerificationEmail.DisabledAdapter do
  @behaviour Api.Accounts.VerificationEmail

  @impl true
  def deliver(_email, _url), do: {:error, :adapter_not_configured}
end
