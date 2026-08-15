defmodule Api.AuthRateLimiter.RedisStore do
  @moduledoc false

  @behaviour Api.AuthRateLimiter.Store

  @timeout 1_000
  @script """
  local exceeded = 0
  local retry_ms = 0

  for index, key in ipairs(KEYS) do
    local offset = ((index - 1) * 2)
    local limit = tonumber(ARGV[offset + 1])
    local window_ms = tonumber(ARGV[offset + 2])
    local count = redis.call('INCR', key)
    local ttl = redis.call('PTTL', key)

    if count == 1 or ttl < 0 then
      redis.call('PEXPIRE', key, window_ms)
      ttl = window_ms
    end

    if count > limit then
      exceeded = 1
      if ttl > retry_ms then
        retry_ms = ttl
      end
    end
  end

  return {exceeded, retry_ms}
  """

  @impl true
  def check(budgets) do
    keys = Enum.map(budgets, & &1.key)

    arguments =
      Enum.flat_map(budgets, &[Integer.to_string(&1.limit), Integer.to_string(&1.window_ms)])

    command = ["EVAL", @script, Integer.to_string(length(keys))] ++ keys ++ arguments

    case Redix.command(redis_name(), command, timeout: @timeout) do
      {:ok, [0, _retry_ms]} ->
        {:ok, :allowed}

      {:ok, [1, retry_ms]} when is_integer(retry_ms) ->
        {:ok, {:rate_limited, max(div(retry_ms + 999, 1_000), 1)}}

      {:ok, unexpected} ->
        {:error, {:unexpected_response, unexpected}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @impl true
  def ready? do
    match?({:ok, "PONG"}, Redix.command(redis_name(), ["PING"], timeout: @timeout))
  rescue
    _error -> false
  catch
    _kind, _reason -> false
  end

  defp redis_name, do: Application.fetch_env!(:api, :auth_rate_limit_redis_name)
end
