defmodule Api.NotificationDelivery.Publisher do
  @moduledoc false

  use GenServer

  require Logger

  alias Api.NotificationDelivery

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(opts) do
    interval =
      Keyword.get(opts, :interval, Application.fetch_env!(:api, :delivery_publisher_interval))

    schedule_publish(interval)
    {:ok, %{interval: interval}}
  end

  @impl true
  def handle_info(:publish, %{interval: interval} = state) do
    case NotificationDelivery.publish_next() do
      :ok ->
        :ok

      :empty ->
        :ok

      {:error, reason} ->
        Logger.warning("notification delivery publisher failed: #{inspect(reason)}")
    end

    schedule_publish(interval)
    {:noreply, state}
  end

  defp schedule_publish(interval), do: Process.send_after(self(), :publish, interval)
end
