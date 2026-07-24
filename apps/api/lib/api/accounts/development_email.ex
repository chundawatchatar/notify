defmodule Api.Accounts.DevelopmentEmail do
  require Logger

  import Swoosh.Email

  def deliver(recipient, subject, text_body) do
    email =
      new()
      |> to(recipient)
      |> from({"Notify", "notifications@notify.local"})
      |> subject(subject)
      |> text_body(text_body)

    case Api.Mailer.deliver(email) do
      {:ok, _metadata} ->
        Logger.info("Development email for #{recipient} delivered to Mailpit")
        :ok

      {:error, reason} ->
        Logger.error("Could not deliver development email to Mailpit: #{inspect(reason)}")
        {:error, :mail_delivery_failed}
    end
  end
end
