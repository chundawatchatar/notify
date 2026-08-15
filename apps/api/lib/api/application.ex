defmodule Api.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children =
      [
        ApiWeb.Telemetry,
        Api.Repo,
        {DNSCluster, query: Application.get_env(:api, :dns_cluster_query) || :ignore},
        {Phoenix.PubSub, name: Api.PubSub}
      ] ++
        auth_rate_limiter_child() ++
        delivery_publisher_child() ++
        [
          # Start to serve requests, typically the last entry
          ApiWeb.Endpoint
        ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Api.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp delivery_publisher_child do
    if Application.get_env(:api, :delivery_publisher_enabled, true) do
      [Api.NotificationDelivery.Publisher]
    else
      []
    end
  end

  defp auth_rate_limiter_child do
    if Application.get_env(:api, :auth_rate_limiter_enabled, false) and
         Application.fetch_env!(:api, :auth_rate_limit_store) ==
           Api.AuthRateLimiter.RedisStore do
      redis_url = Application.fetch_env!(:api, :redis_url)
      redis_name = Application.fetch_env!(:api, :auth_rate_limit_redis_name)

      [{Redix, {redis_url, [name: redis_name]}}]
    else
      []
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ApiWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
