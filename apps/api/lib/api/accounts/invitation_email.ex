defmodule Api.Accounts.InvitationEmail do
  @callback deliver(String.t(), String.t()) :: :ok | {:error, term()}

  def deliver(email, token) when is_binary(email) and is_binary(token) do
    adapter().deliver(email, invitation_url(token))
  end

  defp invitation_url(token) do
    base_url = Application.fetch_env!(:api, :web_app_url)
    base_url <> "/auth/invitations/accept?token=" <> URI.encode_www_form(token)
  end

  defp adapter, do: Application.fetch_env!(:api, :invitation_email_adapter)
end

defmodule Api.Accounts.InvitationEmail.DevAdapter do
  @behaviour Api.Accounts.InvitationEmail

  @impl true
  def deliver(email, url) do
    Api.Accounts.DevelopmentEmail.deliver(
      email,
      "You've been invited to a Notify workspace",
      """
      Accept your invitation to join the Notify workspace:

      #{url}

      This link expires in 7 days and can be used once.
      """
    )
  end
end

defmodule Api.Accounts.InvitationEmail.TestAdapter do
  @behaviour Api.Accounts.InvitationEmail

  @impl true
  def deliver(email, url) do
    send(self(), {:invitation_email, email, url})
    :ok
  end
end

defmodule Api.Accounts.InvitationEmail.DisabledAdapter do
  @behaviour Api.Accounts.InvitationEmail

  @impl true
  def deliver(_email, _url), do: {:error, :adapter_not_configured}
end
