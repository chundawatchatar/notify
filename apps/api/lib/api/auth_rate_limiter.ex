defmodule Api.AuthRateLimiter do
  @moduledoc false

  @type limit_identifier ::
          {dimension :: atom(), value :: String.t(), limit :: pos_integer(),
           window_seconds :: pos_integer()}

  def check(action, identifiers) do
    if enabled?() do
      budgets = Enum.map(identifiers, &budget(action, &1))
      store = store()

      result = store.check(budgets)
      emit(action, outcome(result))
      result
    else
      {:ok, :allowed}
    end
  rescue
    error ->
      emit(action, :unavailable)
      {:error, error}
  catch
    kind, reason ->
      emit(action, :unavailable)
      {:error, {kind, reason}}
  end

  def ready? do
    store = store()
    not enabled?() or store.ready?()
  rescue
    _error -> false
  catch
    _kind, _reason -> false
  end

  defp enabled?, do: Application.get_env(:api, :auth_rate_limiter_enabled, false)
  defp store, do: Application.fetch_env!(:api, :auth_rate_limit_store)

  defp budget(action, {dimension, value, limit, window_seconds}) do
    namespace = Application.fetch_env!(:api, :auth_rate_limit_namespace)

    %{
      key: Enum.join([namespace, "auth", action, dimension, fingerprint(value)], ":"),
      limit: limit,
      window_ms: window_seconds * 1_000
    }
  end

  defp fingerprint(value) do
    secret = Application.fetch_env!(:api, :auth_jwt_secret)

    :crypto.mac(:hmac, :sha256, secret, "auth-rate-limit:" <> value)
    |> Base.url_encode64(padding: false)
  end

  defp outcome({:ok, :allowed}), do: :allowed
  defp outcome({:ok, {:rate_limited, _retry_after}}), do: :rejected
  defp outcome({:error, _reason}), do: :unavailable

  defp emit(action, outcome) do
    :telemetry.execute(
      [:api, :auth_rate_limit],
      %{count: 1},
      %{action: Atom.to_string(action), outcome: Atom.to_string(outcome)}
    )
  end
end
