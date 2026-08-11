defmodule Api.NotificationDelivery.ClaimLease do
  @moduledoc false

  use GenServer

  import Ecto.Query

  alias Api.NotificationIngress.EventOutbox
  alias Api.Repo

  @heartbeat_interval_ms 20_000
  @processing_timeout_seconds 60

  def claim(outbox_id) when is_binary(outbox_id) do
    now = DateTime.utc_now(:second)
    processing_token = Ecto.UUID.generate()

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
               |> EventOutbox.changeset(%{
                 status: "processing",
                 processing_at: now,
                 processing_token: processing_token
               })
               |> Repo.update() do
            {:ok, updated} -> updated
            {:error, changeset} -> Repo.rollback(changeset)
          end
      end
    end)
  end

  def start_link(%EventOutbox{processing_token: processing_token} = outbox, opts \\ [])
      when is_binary(processing_token) do
    heartbeat_interval = Keyword.get(opts, :heartbeat_interval, @heartbeat_interval_ms)

    GenServer.start_link(
      __MODULE__,
      %{outbox_id: outbox.id, processing_token: processing_token, interval: heartbeat_interval}
    )
  end

  def renew(pid, now \\ DateTime.utc_now(:second)) do
    GenServer.call(pid, {:renew, now})
  end

  def complete(pid, published_at) do
    GenServer.call(pid, {:complete, published_at}, :infinity)
  end

  def release(pid, reason) do
    GenServer.call(pid, {:release, reason}, :infinity)
  end

  def reset(%EventOutbox{} = outbox, reason) do
    reset_claim(outbox.id, outbox.processing_token, reason)
  end

  def recover_stale(now) do
    stale_before = DateTime.add(now, -@processing_timeout_seconds, :second)

    Repo.update_all(
      from(outbox in EventOutbox,
        where:
          outbox.status == "processing" and not is_nil(outbox.processing_at) and
            outbox.processing_at <= ^stale_before
      ),
      set: [status: "pending", available_at: now, processing_at: nil, processing_token: nil]
    )

    :ok
  end

  @impl true
  def init(state) do
    schedule_renewal(state.interval)
    {:ok, state}
  end

  @impl true
  def handle_call({:renew, now}, _from, state) do
    case renew_claim(state.outbox_id, state.processing_token, now) do
      :ok -> {:reply, :ok, state}
      {:error, reason} -> {:stop, {:claim_lease_lost, reason}, {:error, reason}, state}
    end
  end

  def handle_call({:complete, published_at}, _from, state) do
    result = mark_published(state.outbox_id, state.processing_token, published_at)
    {:stop, :normal, result, state}
  end

  def handle_call({:release, reason}, _from, state) do
    result = reset_claim(state.outbox_id, state.processing_token, reason)
    {:stop, :normal, result, state}
  end

  @impl true
  def handle_info(:renew, state) do
    case renew_claim(
           state.outbox_id,
           state.processing_token,
           DateTime.utc_now(:second)
         ) do
      :ok ->
        schedule_renewal(state.interval)
        {:noreply, state}

      {:error, reason} ->
        {:stop, {:claim_lease_lost, reason}, state}
    end
  end

  defp renew_claim(outbox_id, processing_token, now) do
    case Repo.update_all(
           owned_claim(outbox_id, processing_token),
           set: [processing_at: now]
         ) do
      {1, _} -> :ok
      {0, _} -> {:error, :claim_lost}
    end
  end

  defp mark_published(outbox_id, processing_token, published_at) do
    case Repo.update_all(
           owned_claim(outbox_id, processing_token),
           set: [
             status: "published",
             published_at: published_at,
             processing_at: nil,
             processing_token: nil
           ]
         ) do
      {1, _} -> :ok
      {0, _} -> {:error, :claim_lost}
    end
  end

  defp reset_claim(outbox_id, processing_token, reason) do
    reset_at = DateTime.utc_now(:second)

    case Repo.update_all(
           owned_claim(outbox_id, processing_token),
           set: [
             status: "pending",
             available_at: reset_at,
             processing_at: nil,
             processing_token: nil
           ]
         ) do
      {1, _} -> {:error, reason}
      {0, _} -> {:error, {:publish_failed, reason, :claim_not_reset}}
    end
  end

  defp owned_claim(outbox_id, processing_token) do
    from outbox in EventOutbox,
      where:
        outbox.id == ^outbox_id and outbox.status == "processing" and
          outbox.processing_token == ^processing_token
  end

  defp schedule_renewal(interval), do: Process.send_after(self(), :renew, interval)
end
