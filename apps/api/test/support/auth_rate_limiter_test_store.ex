defmodule Api.AuthRateLimiter.TestStore do
  @moduledoc false

  @behaviour Api.AuthRateLimiter.Store

  @state_key {__MODULE__, :state}
  @offset_key {__MODULE__, :offset_ms}
  @available_key {__MODULE__, :available}

  def reset do
    Process.put(@state_key, %{})
    Process.put(@offset_key, 0)
    Process.put(@available_key, true)
    :ok
  end

  def advance(seconds) do
    Process.put(@offset_key, Process.get(@offset_key, 0) + seconds * 1_000)
    :ok
  end

  def set_available(available) when is_boolean(available) do
    Process.put(@available_key, available)
    :ok
  end

  def keys do
    @state_key
    |> Process.get(%{})
    |> Map.keys()
  end

  @impl true
  def check(budgets) do
    if Process.get(@available_key, true) do
      now = System.monotonic_time(:millisecond) + Process.get(@offset_key, 0)

      {state, retry_ms} =
        Enum.reduce(budgets, {Process.get(@state_key, %{}), 0}, fn budget, {state, retry_ms} ->
          {count, expires_at} = current_counter(state[budget.key], now, budget.window_ms)
          next_count = count + 1
          next_state = Map.put(state, budget.key, {next_count, expires_at})

          next_retry_ms =
            if next_count > budget.limit do
              max(retry_ms, expires_at - now)
            else
              retry_ms
            end

          {next_state, next_retry_ms}
        end)

      Process.put(@state_key, state)

      if retry_ms > 0 do
        {:ok, {:rate_limited, max(div(retry_ms + 999, 1_000), 1)}}
      else
        {:ok, :allowed}
      end
    else
      {:error, :unavailable}
    end
  end

  @impl true
  def ready?, do: Process.get(@available_key, true)

  defp current_counter(nil, now, window_ms), do: {0, now + window_ms}

  defp current_counter({_count, expires_at}, now, window_ms) when expires_at <= now,
    do: {0, now + window_ms}

  defp current_counter(counter, _now, _window_ms), do: counter
end
