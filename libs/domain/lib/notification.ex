defmodule Domain.Notification do
  @moduledoc """
  Domain contract and lifecycle rules for a notification event.

  This module intentionally has no database, Phoenix, or Ecto dependencies. It
  represents the business shape of a notification and the allowed status
  transitions that other layers must respect.
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
          tenant_id: String.t(),
          app_id: String.t() | nil,
          template_id: String.t(),
          channel: channel(),
          status: status(),
          recipient: recipient(),
          payload: map(),
          metadata: map(),
          idempotency_key: String.t() | nil,
          created_at: DateTime.t(),
          delivered_at: DateTime.t() | nil,
          failure_reason: String.t() | nil
        }

  @type validation_error :: {atom(), atom() | {atom(), keyword()}}

  @channels [:email, :sms, :push, :in_app]
  @statuses [:draft, :queued, :sent, :delivered, :failed, :cancelled]
  @terminal_statuses [:delivered, :failed, :cancelled]
  @transitions %{
    draft: [:queued, :cancelled],
    queued: [:sent, :failed, :cancelled],
    sent: [:delivered, :failed],
    delivered: [],
    failed: [],
    cancelled: []
  }

  @channel_lookup for channel <- @channels, into: %{}, do: {Atom.to_string(channel), channel}
  @status_lookup for status <- @statuses, into: %{}, do: {Atom.to_string(status), status}

  @enforce_keys [:id, :tenant_id, :template_id, :channel, :status, :recipient, :created_at]
  defstruct [
    :id,
    :tenant_id,
    :template_id,
    :channel,
    :status,
    :recipient,
    :created_at,
    :delivered_at,
    :failure_reason,
    app_id: nil,
    payload: %{},
    metadata: %{},
    idempotency_key: nil
  ]

  @doc """
  Builds and validates a notification from map attributes.

  Atom and string keys are both accepted so API code can pass decoded request
  parameters through the same business validation path.
  """
  @spec new(map()) :: {:ok, t()} | {:error, [validation_error()]}
  def new(attrs) when is_map(attrs) do
    notification =
      struct!(__MODULE__, %{
        id: get_attr(attrs, :id),
        tenant_id: get_attr(attrs, :tenant_id),
        app_id: get_attr(attrs, :app_id),
        template_id: get_attr(attrs, :template_id),
        channel: normalize_channel!(get_attr(attrs, :channel)),
        status: normalize_status!(get_attr(attrs, :status, :draft)),
        recipient: get_attr(attrs, :recipient),
        payload: get_attr(attrs, :payload, %{}),
        metadata: get_attr(attrs, :metadata, %{}),
        idempotency_key: get_attr(attrs, :idempotency_key),
        created_at: get_attr(attrs, :created_at, DateTime.utc_now()),
        delivered_at: get_attr(attrs, :delivered_at),
        failure_reason: get_attr(attrs, :failure_reason)
      })

    case validate(notification) do
      :ok -> {:ok, notification}
      {:error, errors} -> {:error, errors}
    end
  end

  @doc """
  Validates a notification domain struct.
  """
  @spec validate(t()) :: :ok | {:error, [validation_error()]}
  def validate(%__MODULE__{} = notification) do
    errors =
      []
      |> require_string(:id, notification.id)
      |> require_string(:tenant_id, notification.tenant_id)
      |> require_string(:template_id, notification.template_id)
      |> require_map(:recipient, notification.recipient)
      |> require_recipient_id(notification.recipient)
      |> require_map(:payload, notification.payload)
      |> require_map(:metadata, notification.metadata)
      |> require_datetime(:created_at, notification.created_at)
      |> validate_optional_datetime(:delivered_at, notification.delivered_at)
      |> validate_channel(notification.channel)
      |> validate_status(notification.status)
      |> validate_status_requirements(
        notification.status,
        notification.delivered_at,
        notification.failure_reason
      )
      |> Enum.reverse()

    if errors == [], do: :ok, else: {:error, errors}
  end

  @doc """
  Returns the channels supported by the domain.
  """
  @spec channels() :: [channel()]
  def channels, do: @channels

  @doc """
  Returns every status in the notification lifecycle.
  """
  @spec statuses() :: [status()]
  def statuses, do: @statuses

  @doc """
  Checks whether a value is a supported notification channel.
  """
  @spec valid_channel?(term()) :: boolean()
  def valid_channel?(channel), do: match?({:ok, _}, normalize_channel(channel))

  @doc """
  Checks whether a value is a supported notification status.
  """
  @spec valid_status?(term()) :: boolean()
  def valid_status?(status), do: match?({:ok, _}, normalize_status(status))

  @doc """
  Returns true when the status is terminal.
  """
  @spec terminal_status?(term()) :: boolean()
  def terminal_status?(status) do
    case normalize_status(status) do
      {:ok, status} -> status in @terminal_statuses
      :error -> false
    end
  end

  @doc """
  Returns true when the lifecycle allows moving from one status to another.
  """
  @spec can_transition?(term(), term()) :: boolean()
  def can_transition?(from_status, to_status) do
    with {:ok, from_status} <- normalize_status(from_status),
         {:ok, to_status} <- normalize_status(to_status) do
      to_status in Map.fetch!(@transitions, from_status)
    else
      :error -> false
    end
  end

  @doc """
  Moves a notification to the queued status.
  """
  @spec queue(t()) :: {:ok, t()} | {:error, [validation_error()]}
  def queue(%__MODULE__{} = notification), do: transition(notification, :queued)

  @doc """
  Moves a notification to the sent status.
  """
  @spec mark_sent(t()) :: {:ok, t()} | {:error, [validation_error()]}
  def mark_sent(%__MODULE__{} = notification), do: transition(notification, :sent)

  @doc """
  Moves a notification to the delivered status.
  """
  @spec mark_delivered(t(), DateTime.t()) :: {:ok, t()} | {:error, [validation_error()]}
  def mark_delivered(%__MODULE__{} = notification, delivered_at \\ DateTime.utc_now()) do
    transition(notification, :delivered, delivered_at: delivered_at, failure_reason: nil)
  end

  @doc """
  Moves a notification to the failed status and records a reason.
  """
  @spec mark_failed(t(), String.t()) :: {:ok, t()} | {:error, [validation_error()]}
  def mark_failed(%__MODULE__{} = notification, reason) do
    transition(notification, :failed, failure_reason: reason)
  end

  @doc """
  Moves a notification to the cancelled status.
  """
  @spec cancel(t(), String.t() | nil) :: {:ok, t()} | {:error, [validation_error()]}
  def cancel(%__MODULE__{} = notification, reason \\ nil) do
    transition(notification, :cancelled, failure_reason: reason)
  end

  @spec transition(t(), term(), keyword()) :: {:ok, t()} | {:error, [validation_error()]}
  defp transition(%__MODULE__{} = notification, next_status, attrs \\ []) do
    with :ok <- validate(notification),
         {:ok, next_status} <- normalize_status(next_status),
         :ok <- ensure_transition(notification.status, next_status) do
      next_notification =
        notification
        |> Map.put(:status, next_status)
        |> Map.put(:delivered_at, Keyword.get(attrs, :delivered_at, notification.delivered_at))
        |> Map.put(
          :failure_reason,
          Keyword.get(attrs, :failure_reason, notification.failure_reason)
        )

      validate(next_notification)
      |> case do
        :ok -> {:ok, next_notification}
        {:error, errors} -> {:error, errors}
      end
    else
      :error -> {:error, [status: {:invalid, allowed: @statuses}]}
      {:error, errors} -> {:error, errors}
    end
  end

  defp ensure_transition(from_status, to_status) do
    if can_transition?(from_status, to_status) do
      :ok
    else
      {:error, [status: {:invalid_transition, from: from_status, to: to_status}]}
    end
  end

  defp get_attr(attrs, key, default \\ nil) do
    Map.get(attrs, key, Map.get(attrs, Atom.to_string(key), default))
  end

  defp normalize_channel!(channel) do
    case normalize_channel(channel) do
      {:ok, channel} -> channel
      :error -> channel
    end
  end

  defp normalize_channel(channel) when channel in @channels, do: {:ok, channel}

  defp normalize_channel(channel) when is_binary(channel) do
    Map.fetch(@channel_lookup, channel)
    |> case do
      {:ok, channel} -> {:ok, channel}
      :error -> :error
    end
  end

  defp normalize_channel(_channel), do: :error

  defp normalize_status!(status) do
    case normalize_status(status) do
      {:ok, status} -> status
      :error -> status
    end
  end

  defp normalize_status(status) when status in @statuses, do: {:ok, status}

  defp normalize_status(status) when is_binary(status) do
    Map.fetch(@status_lookup, status)
    |> case do
      {:ok, status} -> {:ok, status}
      :error -> :error
    end
  end

  defp normalize_status(_status), do: :error

  defp require_string(errors, _field, value) when is_binary(value) and value != "", do: errors
  defp require_string(errors, field, _value), do: [{field, :required} | errors]

  defp require_map(errors, _field, value) when is_map(value), do: errors
  defp require_map(errors, field, _value), do: [{field, :required} | errors]

  defp require_recipient_id(errors, %{id: id}), do: require_string(errors, :recipient_id, id)
  defp require_recipient_id(errors, %{"id" => id}), do: require_string(errors, :recipient_id, id)
  defp require_recipient_id(errors, _recipient), do: [{:recipient_id, :required} | errors]

  defp require_datetime(errors, _field, %DateTime{}), do: errors
  defp require_datetime(errors, field, _value), do: [{field, :required} | errors]

  defp validate_optional_datetime(errors, _field, nil), do: errors
  defp validate_optional_datetime(errors, _field, %DateTime{}), do: errors
  defp validate_optional_datetime(errors, field, _value), do: [{field, :invalid} | errors]

  defp validate_channel(errors, field) when field in @channels, do: errors
  defp validate_channel(errors, _field), do: [{:channel, {:invalid, allowed: @channels}} | errors]

  defp validate_status(errors, field) when field in @statuses, do: errors
  defp validate_status(errors, _field), do: [{:status, {:invalid, allowed: @statuses}} | errors]

  defp validate_status_requirements(errors, :delivered, %DateTime{}, _failure_reason), do: errors

  defp validate_status_requirements(errors, :delivered, _delivered_at, _failure_reason) do
    [{:delivered_at, :required} | errors]
  end

  defp validate_status_requirements(errors, :failed, _delivered_at, failure_reason) do
    require_string(errors, :failure_reason, failure_reason)
  end

  defp validate_status_requirements(errors, _status, _delivered_at, _failure_reason), do: errors
end
