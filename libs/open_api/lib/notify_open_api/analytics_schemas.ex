defmodule NotifyOpenApi.AnalyticsSchemas do
  alias OpenApiSpex.Schema

  defmodule Window do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsWindow",
      type: :object,
      properties: %{
        name: %Schema{type: :string, enum: ["24h", "7d", "30d"]},
        start_at: %Schema{type: :string, format: "date-time"},
        as_of: %Schema{type: :string, format: "date-time"}
      },
      required: [:name, :start_at, :as_of]
    })
  end

  defmodule Filters do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsFilters",
      type: :object,
      properties: %{
        app_id: %Schema{type: :string, format: :uuid, nullable: true},
        environment_id: %Schema{type: :string, format: :uuid, nullable: true}
      },
      required: [:app_id, :environment_id]
    })
  end

  defmodule PublicationRate do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsPublicationRate",
      type: :object,
      properties: %{
        numerator: %Schema{type: :integer, minimum: 0},
        denominator: %Schema{type: :integer, minimum: 0},
        value: %Schema{type: :number, format: :float, nullable: true}
      },
      required: [:numerator, :denominator, :value]
    })
  end

  defmodule Counts do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsCounts",
      type: :object,
      properties: %{
        accepted: %Schema{type: :integer, minimum: 0},
        pending: %Schema{type: :integer, minimum: 0},
        processing: %Schema{type: :integer, minimum: 0},
        published: %Schema{type: :integer, minimum: 0},
        unpublished: %Schema{type: :integer, minimum: 0},
        publication_rate: PublicationRate
      },
      required: [
        :accepted,
        :pending,
        :processing,
        :published,
        :unpublished,
        :publication_rate
      ]
    })
  end

  defmodule PublicationLatency do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsPublicationLatency",
      type: :object,
      properties: %{
        sample_count: %Schema{type: :integer, minimum: 0},
        p50_ms: %Schema{type: :integer, minimum: 0, nullable: true},
        p95_ms: %Schema{type: :integer, minimum: 0, nullable: true}
      },
      required: [:sample_count, :p50_ms, :p95_ms]
    })
  end

  defmodule Metrics do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsMetrics",
      type: :object,
      properties: %{
        counts: Counts,
        publication_latency: PublicationLatency
      },
      required: [:counts, :publication_latency]
    })
  end

  defmodule TrendBucket do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsTrendBucket",
      type: :object,
      properties: %{
        start_at: %Schema{type: :string, format: "date-time"},
        end_at: %Schema{type: :string, format: "date-time"},
        counts: Counts
      },
      required: [:start_at, :end_at, :counts]
    })
  end

  defmodule AppRow do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsAppRow",
      type: :object,
      properties: %{
        app_id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string},
        archived: %Schema{type: :boolean},
        metrics: Metrics
      },
      required: [:app_id, :name, :archived, :metrics]
    })
  end

  defmodule Response do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "DeliveryAnalyticsResponse",
      type: :object,
      properties: %{
        window: Window,
        filters: Filters,
        totals: Metrics,
        trend: %Schema{type: :array, items: TrendBucket},
        apps: %Schema{type: :array, items: AppRow}
      },
      required: [:window, :filters, :totals, :trend, :apps]
    })
  end
end
