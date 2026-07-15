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

  require Logger

  @impl true
  def deliver(email, url) do
    directory = Application.fetch_env!(:api, :dev_email_outbox_dir)
    path = Path.join(directory, filename(email))

    with :ok <- File.mkdir_p(directory),
         :ok <- File.chmod(directory, 0o700),
         :ok <- File.write(path, email_body(email, url), [:exclusive]),
         :ok <- File.chmod(path, 0o600) do
      Logger.info("Development password reset email for #{email} written to #{path}")
      :ok
    else
      {:error, reason} ->
        File.rm(path)
        Logger.error("Could not write development password reset email: #{inspect(reason)}")
        {:error, :outbox_write_failed}
    end
  end

  defp filename(email) do
    timestamp = Calendar.strftime(DateTime.utc_now(), "%Y%m%dT%H%M%SZ")
    unique = System.unique_integer([:positive, :monotonic])
    safe_email = String.replace(email, ~r/[^a-zA-Z0-9@._-]/u, "_")
    "#{timestamp}-#{unique}-password-reset-#{safe_email}.eml"
  end

  defp email_body(email, url) do
    """
    To: #{email}
    Subject: Reset your Notify password
    Content-Type: text/plain; charset=UTF-8

    Use this link to reset your Notify password:

    #{url}

    This link expires in one hour and can be used once.
    If you did not request a password reset, you can ignore this email.
    """
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
