defmodule Api.NotificationDelivery do
  @moduledoc """
  Best-effort realtime delivery for accepted notification events.

  The accepted event and outbox row are the durable boundary. This context
  claims one pending handoff, broadcasts a small envelope through Phoenix
  PubSub, and records `published` only after PubSub accepts the broadcast.
  """

  import Ecto.Query

  alias Api.NotificationIngress.{EventOutbox, NotificationEvent}
  alias Api.Repo

  @topic_prefix "tenant"
  @pubsub_server Api.PubSub
  @event_name "notification.created"
  @processing_timeout_seconds 60

  @type scope :: %{
          required(:workspace_id) => Ecto.UUID.t(),
          required(:notification_app_id) => Ecto.UUID.t(),
          required(:app_environment_id) => Ecto.UUID.t(),
          required(:recipient_id) => String.t()
        }

  @doc "Returns the recipient-specific PubSub topic for a persisted event scope."
  @spec topic(scope()) :: String.t()
  def topic(scope) when is_map(scope) do
    Enum.join(
      [
        @topic_prefix,
        fetch!(scope, :workspace_id),
        "app",
        fetch!(scope, :notification_app_id),
        "environment",
        fetch!(scope, :app_environment_id),
        "recipient",
        fetch!(scope, :recipient_id)
      ],
      ":"
    )
  end

  @doc "Publishes one pending outbox row by id."
  @spec publish(Ecto.UUID.t()) :: :ok | {:error, term()}
  def publish(outbox_id) when is_binary(outbox_id) do
    case claim(outbox_id) do
      {:ok, outbox} ->
        result =
          with {:ok, event} <- load_event(outbox),
               envelope = envelope(event),
               :ok <- broadcast(event, envelope),
               {:ok, _outbox} <- mark_published(outbox, DateTime.utc_now(:second)) do
            :ok
          end

        case result do
          :ok -> :ok
          failure -> reset_claim(outbox, failure)
        end

      {:error, :not_publishable} = error ->
        error

      {:error, reason} ->
        {:error, reason}
    end
  end

  def publish(_outbox_id), do: {:error, :invalid_outbox_id}

  @doc "Publishes the next available pending handoff, if one exists."
  @spec publish_next(DateTime.t()) :: :ok | {:error, term()} | :empty
  def publish_next(now \\ DateTime.utc_now(:second)) do
    with :ok <- recover_stale_claims(now) do
      case Repo.one(
             from outbox in EventOutbox,
               where: outbox.status == "pending" and outbox.available_at <= ^now,
               order_by: [asc: outbox.available_at, asc: outbox.id],
               select: outbox.id
           ) do
        nil -> :empty
        outbox_id -> publish(outbox_id)
      end
    end
  end

  @doc "Returns the exact delivery envelope sent through PubSub."
  @spec envelope(NotificationEvent.t()) :: map()
  def envelope(%NotificationEvent{} = event) do
    %{
      event: @event_name,
      data: %{
        eventId: event.id,
        notification: event.event_name,
        recipientId: event.recipient_id,
        occurredAt: event.occurred_at,
        payload: event.payload,
        metadata: event.metadata
      }
    }
  end

  defp claim(outbox_id) do
    now = DateTime.utc_now(:second)

    Repo.transaction(fn ->
      outbox =
        Repo.one(
          from outbox in EventOutbox,
            where:
              outbox.id == ^outbox_id and outbox.status == "pending" and
                outbox.available_at <= ^now,
            lock: "FOR UPDATE"
        )

      case outbox do
        nil ->
          Repo.rollback(:not_publishable)

        outbox ->
          case outbox
               |> EventOutbox.changeset(%{status: "processing", processing_at: now})
               |> Repo.update() do
            {:ok, updated} -> updated
            {:error, changeset} -> Repo.rollback(changeset)
          end
      end
    end)
  end

  defp load_event(%EventOutbox{notification_event_id: event_id}) do
    case Repo.get(NotificationEvent, event_id) do
      %NotificationEvent{} = event -> {:ok, event}
      nil -> {:error, :event_not_found}
    end
  end

  defp broadcast(%NotificationEvent{} = event, envelope) do
    try do
      Phoenix.PubSub.broadcast(@pubsub_server, topic(scope(event)), envelope)
    rescue
      error -> {:error, {:pubsub_unavailable, error.__struct__}}
    catch
      kind, reason -> {:error, {:pubsub_unavailable, {kind, reason}}}
    end
  end

  defp mark_published(%EventOutbox{} = outbox, published_at) do
    outbox
    |> EventOutbox.changeset(%{status: "published", published_at: published_at})
    |> Repo.update()
  end

  defp reset_claim(%EventOutbox{} = outbox, reason) do
    reset_at = DateTime.utc_now(:second)

    case Repo.update_all(
           from(outbox in EventOutbox,
             where: outbox.id == ^outbox.id and outbox.status == "processing"
           ),
           set: [status: "pending", available_at: reset_at, processing_at: nil]
         ) do
      {1, _} -> {:error, reason}
      {0, _} -> {:error, {:publish_failed, reason, :claim_not_reset}}
    end
  end

  defp recover_stale_claims(now) do
    stale_before = DateTime.add(now, -@processing_timeout_seconds, :second)

    Repo.update_all(
      from(outbox in EventOutbox,
        where:
          outbox.status == "processing" and not is_nil(outbox.processing_at) and
            outbox.processing_at <= ^stale_before
      ),
      set: [status: "pending", available_at: now, processing_at: nil]
    )

    :ok
  end

  defp scope(%NotificationEvent{} = event) do
    %{
      workspace_id: event.workspace_id,
      notification_app_id: event.notification_app_id,
      app_environment_id: event.app_environment_id,
      recipient_id: event.recipient_id
    }
  end

  defp fetch!(map, key) do
    value = Map.fetch!(map, key)

    if is_binary(value) and byte_size(value) > 0 do
      value
    else
      raise ArgumentError, "#{key} must be a non-empty string"
    end
  end
end
