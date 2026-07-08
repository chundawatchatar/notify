defmodule Domain.Notification do
  @moduledoc """
  Domain contract for a notification event.
  """

  @type channel :: :email | :sms | :push | :in_app
  @type status :: :draft | :queued | :sent | :delivered | :failed | :cancelled

  @type recipient :: %{
          required(:id) => String.t(),
          optional(:email) => String.t(),
          optional(:phone_number) => String.t(),
          optional(:display_name) => String.t()
        }

  @type t :: %__MODULE__{
          id: String.t(),
          template_id: String.t(),
          channel: channel(),
          status: status(),
          recipient: recipient(),
          created_at: DateTime.t(),
          delivered_at: DateTime.t() | nil,
          failure_reason: String.t() | nil
        }

  @enforce_keys [:id, :template_id, :channel, :status, :recipient, :created_at]
  defstruct [
    :id,
    :template_id,
    :channel,
    :status,
    :recipient,
    :created_at,
    :delivered_at,
    :failure_reason
  ]
end
