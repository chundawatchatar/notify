defmodule Api.AuthRateLimiter.Store do
  @moduledoc false

  @type budget :: %{key: String.t(), limit: pos_integer(), window_ms: pos_integer()}

  @callback check([budget()]) ::
              {:ok, :allowed | {:rate_limited, retry_after_seconds :: pos_integer()}}
              | {:error, term()}
  @callback ready?() :: boolean()
end
