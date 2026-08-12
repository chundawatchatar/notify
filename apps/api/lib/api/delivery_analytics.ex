defmodule Api.DeliveryAnalytics do
  @moduledoc """
  Tenant-scoped aggregate queries for accepted events and PubSub handoffs.

  Analytics are derived from the durable ingress event and its one-to-one
  outbox row. The queries select aggregate values only and never load event
  payloads, recipient identifiers, or ingress credentials.
  """

  import Ecto.Query

  alias Api.NotificationApps.{Environment, NotificationApp}
  alias Api.NotificationIngress.{EventOutbox, NotificationEvent}
  alias Api.Repo
  alias Api.Workspaces.Workspace
  alias Domain.DeliveryAnalytics, as: AnalyticsContract

  @type filters :: %{
          optional(:notification_app_id) => Ecto.UUID.t(),
          optional(:app_environment_id) => Ecto.UUID.t()
        }

  @type latency :: %{
          sample_count: non_neg_integer(),
          p50_ms: non_neg_integer() | nil,
          p95_ms: non_neg_integer() | nil
        }

  @doc """
  Returns delivery analytics for one authorized workspace and fixed time window.

  An environment filter requires its owning app filter. Unknown identifiers and
  identifiers from another workspace both return `:not_found`.
  """
  @spec query(Workspace.t(), AnalyticsContract.window_name(), filters(), DateTime.t()) ::
          {:ok, map()} | {:error, :invalid_scope | :invalid_window | :not_found}
  def query(workspace, window_name, filters \\ %{}, as_of \\ DateTime.utc_now(:second))

  def query(%Workspace{id: workspace_id}, window_name, filters, %DateTime{} = as_of)
      when is_map(filters) do
    with {:ok, window} <- AnalyticsContract.window(window_name, as_of),
         {:ok, scope} <- resolve_scope(workspace_id, filters) do
      source_query = source_query(workspace_id, scope, window)

      {:ok,
       %{
         window: window,
         filters: scope,
         totals: source_query |> select_metrics() |> Repo.one!() |> normalize_metrics(),
         trend: trend(source_query, window),
         apps: app_breakdown(source_query)
       }}
    end
  end

  def query(_workspace, _window_name, _filters, _as_of), do: {:error, :invalid_scope}

  defp resolve_scope(workspace_id, filters) do
    if Enum.all?(Map.keys(filters), &valid_filter_key?/1) do
      notification_app_id = filter_value(filters, :notification_app_id)
      app_environment_id = filter_value(filters, :app_environment_id)

      resolve_identifiers(workspace_id, notification_app_id, app_environment_id)
    else
      {:error, :invalid_scope}
    end
  end

  defp resolve_identifiers(_workspace_id, nil, nil) do
    {:ok, %{notification_app_id: nil, app_environment_id: nil}}
  end

  defp resolve_identifiers(_workspace_id, nil, _app_environment_id),
    do: {:error, :invalid_scope}

  defp resolve_identifiers(workspace_id, notification_app_id, nil) do
    with {:ok, notification_app_id} <- cast_uuid(notification_app_id),
         true <-
           Repo.exists?(
             from notification_app in NotificationApp,
               where:
                 notification_app.id == ^notification_app_id and
                   notification_app.workspace_id == ^workspace_id
           ) do
      {:ok, %{notification_app_id: notification_app_id, app_environment_id: nil}}
    else
      _ -> {:error, :not_found}
    end
  end

  defp resolve_identifiers(workspace_id, notification_app_id, app_environment_id) do
    with {:ok, notification_app_id} <- cast_uuid(notification_app_id),
         {:ok, app_environment_id} <- cast_uuid(app_environment_id),
         true <-
           Repo.exists?(
             from environment in Environment,
               join: notification_app in assoc(environment, :notification_app),
               where:
                 environment.id == ^app_environment_id and
                   environment.notification_app_id == ^notification_app_id and
                   notification_app.workspace_id == ^workspace_id
           ) do
      {:ok,
       %{
         notification_app_id: notification_app_id,
         app_environment_id: app_environment_id
       }}
    else
      _ -> {:error, :not_found}
    end
  end

  defp source_query(workspace_id, scope, window) do
    NotificationEvent
    |> from(as: :event)
    |> join(:inner, [event: event], outbox in EventOutbox,
      as: :outbox,
      on:
        outbox.notification_event_id == event.id and
          outbox.app_environment_id == event.app_environment_id
    )
    |> join(:inner, [event: event], notification_app in NotificationApp,
      as: :notification_app,
      on:
        notification_app.id == event.notification_app_id and
          notification_app.workspace_id == event.workspace_id
    )
    |> join(:inner, [event: event], environment in Environment,
      as: :environment,
      on:
        environment.id == event.app_environment_id and
          environment.notification_app_id == event.notification_app_id
    )
    |> where(
      [event: event, notification_app: notification_app],
      event.workspace_id == ^workspace_id and
        notification_app.workspace_id == ^workspace_id and
        event.accepted_at >= ^window.start_at and
        event.accepted_at < ^window.as_of
    )
    |> maybe_filter(:notification_app_id, scope.notification_app_id)
    |> maybe_filter(:app_environment_id, scope.app_environment_id)
  end

  defp select_counts(query) do
    select(query, [event: event, outbox: outbox], %{
      accepted: count(event.id, :distinct),
      pending: filter(count(event.id, :distinct), outbox.status == "pending"),
      processing: filter(count(event.id, :distinct), outbox.status == "processing"),
      published: filter(count(event.id, :distinct), outbox.status == "published")
    })
  end

  defp select_metrics(query) do
    query
    |> select_counts()
    |> select_merge([event: event, outbox: outbox], %{
      published_sample_count:
        filter(
          count(event.id, :distinct),
          outbox.status == "published" and not is_nil(outbox.published_at)
        ),
      publication_latency_p50_ms:
        fragment(
          "percentile_disc(0.5) WITHIN GROUP (ORDER BY CAST(EXTRACT(EPOCH FROM (? - ?)) * 1000 AS bigint)) FILTER (WHERE ? = 'published' AND ? IS NOT NULL)",
          outbox.published_at,
          event.accepted_at,
          outbox.status,
          outbox.published_at
        ),
      publication_latency_p95_ms:
        fragment(
          "percentile_disc(0.95) WITHIN GROUP (ORDER BY CAST(EXTRACT(EPOCH FROM (? - ?)) * 1000 AS bigint)) FILTER (WHERE ? = 'published' AND ? IS NOT NULL)",
          outbox.published_at,
          event.accepted_at,
          outbox.status,
          outbox.published_at
        )
    })
  end

  defp trend(source_query, window) do
    bucketed_query =
      select(source_query, [event: event, outbox: outbox], %{
        event_id: event.id,
        status: outbox.status,
        bucket_index:
          fragment(
            "floor(EXTRACT(EPOCH FROM (? - ?)) / ?)::integer",
            event.accepted_at,
            ^window.start_at,
            ^window.bucket_seconds
          )
      })

    populated_buckets =
      from(bucket in subquery(bucketed_query),
        group_by: bucket.bucket_index,
        select: %{
          bucket_index: bucket.bucket_index,
          accepted: count(bucket.event_id, :distinct),
          pending: filter(count(bucket.event_id, :distinct), bucket.status == "pending"),
          processing: filter(count(bucket.event_id, :distinct), bucket.status == "processing"),
          published: filter(count(bucket.event_id, :distinct), bucket.status == "published")
        }
      )
      |> Repo.all()
      |> Map.new(fn row -> {row.bucket_index, normalize_counts(row)} end)

    window
    |> AnalyticsContract.buckets()
    |> Enum.with_index()
    |> Enum.map(fn {boundary, index} ->
      Map.put(boundary, :counts, Map.get(populated_buckets, index, empty_counts()))
    end)
  end

  defp app_breakdown(source_query) do
    source_query
    |> group_by(
      [notification_app: notification_app],
      [notification_app.id, notification_app.name, notification_app.archived_at]
    )
    |> select_metrics()
    |> select_merge([notification_app: notification_app], %{
      app_id: notification_app.id,
      name: notification_app.name,
      archived_at: notification_app.archived_at
    })
    |> order_by([event: event, notification_app: notification_app],
      desc: count(event.id, :distinct),
      asc: notification_app.id
    )
    |> Repo.all()
    |> Enum.map(fn row ->
      %{
        app_id: row.app_id,
        name: row.name,
        archived: not is_nil(row.archived_at),
        metrics: normalize_metrics(row)
      }
    end)
  end

  defp normalize_metrics(row) do
    %{
      counts: normalize_counts(row),
      publication_latency: %{
        sample_count: row.published_sample_count,
        p50_ms: row.publication_latency_p50_ms,
        p95_ms: row.publication_latency_p95_ms
      }
    }
  end

  defp normalize_counts(row) do
    AnalyticsContract.summarize_counts(row.pending, row.processing, row.published)
  end

  defp empty_counts, do: AnalyticsContract.summarize_counts(0, 0, 0)

  defp maybe_filter(query, _field, nil), do: query

  defp maybe_filter(query, :notification_app_id, notification_app_id) do
    where(query, [event: event], event.notification_app_id == ^notification_app_id)
  end

  defp maybe_filter(query, :app_environment_id, app_environment_id) do
    where(query, [event: event], event.app_environment_id == ^app_environment_id)
  end

  defp filter_value(filters, key),
    do: Map.get(filters, key, Map.get(filters, Atom.to_string(key)))

  defp valid_filter_key?(key) when key in [:notification_app_id, :app_environment_id], do: true

  defp valid_filter_key?(key) when key in ["notification_app_id", "app_environment_id"],
    do: true

  defp valid_filter_key?(_key), do: false

  defp cast_uuid(value) do
    case Ecto.UUID.cast(value) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :not_found}
    end
  end
end
