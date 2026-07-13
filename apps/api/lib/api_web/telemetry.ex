defmodule ApiWeb.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children =
      [
        {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
      ] ++ metrics_reporter_children()

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      counter("phoenix.endpoint.stop.count"),
      distribution("phoenix.endpoint.stop.duration.seconds",
        event_name: [:phoenix, :endpoint, :stop],
        measurement: :duration,
        unit: {:native, :second},
        reporter_options: [buckets: duration_buckets()]
      ),
      distribution("phoenix.router_dispatch.stop.duration.seconds",
        event_name: [:phoenix, :router_dispatch, :stop],
        measurement: :duration,
        tags: [:route],
        unit: {:native, :second},
        reporter_options: [buckets: duration_buckets()]
      ),
      counter("phoenix.router_dispatch.exception.count",
        event_name: [:phoenix, :router_dispatch, :exception],
        tags: [:route]
      ),
      distribution("api.repo.query.total_time.seconds",
        event_name: [:api, :repo, :query],
        measurement: :total_time,
        unit: {:native, :second},
        reporter_options: [buckets: database_duration_buckets()]
      ),
      distribution("api.repo.query.query_time.seconds",
        event_name: [:api, :repo, :query],
        measurement: :query_time,
        unit: {:native, :second},
        reporter_options: [buckets: database_duration_buckets()]
      ),
      distribution("api.repo.query.queue_time.seconds",
        event_name: [:api, :repo, :query],
        measurement: :queue_time,
        unit: {:native, :second},
        reporter_options: [buckets: database_duration_buckets()]
      ),
      last_value("vm.memory.total.bytes",
        event_name: [:vm, :memory],
        measurement: :total,
        unit: :byte
      ),
      last_value("vm.total_run_queue_lengths.total"),
      last_value("vm.total_run_queue_lengths.cpu"),
      last_value("vm.total_run_queue_lengths.io")
    ]
  end

  defp metrics_reporter_children do
    if Application.get_env(:api, :metrics_enabled, false) do
      [
        {TelemetryMetricsPrometheus.Core,
         metrics: metrics(), name: :api_prometheus_metrics, start_async: false}
      ]
    else
      []
    end
  end

  defp duration_buckets, do: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]

  defp database_duration_buckets,
    do: [0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]

  defp periodic_measurements do
    []
  end
end
