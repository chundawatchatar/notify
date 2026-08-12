defmodule Api.DeliveryAnalyticsTest do
  use Api.DataCase, async: false

  alias Api.DeliveryAnalytics
  alias Api.NotificationApps
  alias Api.NotificationIngress
  alias Api.NotificationIngress.EventOutbox

  test "aggregates current handoff states, latency, app rows, and zero-filled buckets" do
    membership = insert(:membership)
    workspace = membership.workspace
    payments = create_app!(workspace, "Payments")
    messaging = create_app!(workspace, "Messaging")
    payments_environment = environment(payments, "development")
    messaging_environment = environment(messaging, "development")
    as_of = ~U[2026-08-12 12:00:00Z]

    accept_event!(workspace, payments, payments_environment, DateTime.add(as_of, -10_800),
      status: "published",
      publication_latency_seconds: 1
    )

    accept_event!(workspace, payments, payments_environment, DateTime.add(as_of, -7_200),
      status: "published",
      publication_latency_seconds: 5
    )

    accept_event!(workspace, payments, payments_environment, DateTime.add(as_of, -3_600),
      status: "pending"
    )

    accept_event!(workspace, messaging, messaging_environment, DateTime.add(as_of, -1_800),
      status: "processing"
    )

    assert :ok = NotificationApps.archive_notification_app(workspace, messaging.app_slug)
    assert {:ok, analytics} = DeliveryAnalytics.query(workspace, "24h", %{}, as_of)

    assert analytics.totals == %{
             counts: %{
               accepted: 4,
               pending: 1,
               processing: 1,
               published: 2,
               unpublished: 2,
               publication_rate: %{numerator: 2, denominator: 4, value: 0.5}
             },
             publication_latency: %{sample_count: 2, p50_ms: 1_000, p95_ms: 5_000}
           }

    assert [payments_row, messaging_row] = analytics.apps
    assert payments_row.app_id == payments.id
    assert payments_row.metrics.counts.accepted == 3
    refute payments_row.archived
    assert messaging_row.app_id == messaging.id
    assert messaging_row.metrics.counts.accepted == 1
    assert messaging_row.archived

    assert length(analytics.trend) == 24
    assert Enum.sum(Enum.map(analytics.trend, & &1.counts.accepted)) == 4
    assert Enum.count(analytics.trend, &(&1.counts.accepted == 0)) == 21
  end

  test "uses the accepted-at half-open boundary" do
    membership = insert(:membership)
    workspace = membership.workspace
    notification_app = create_app!(workspace, "Boundaries")
    environment = environment(notification_app, "development")
    as_of = ~U[2026-08-12 12:00:00Z]
    start_at = DateTime.add(as_of, -24 * 60 * 60, :second)

    accept_event!(workspace, notification_app, environment, DateTime.add(start_at, -1),
      status: "pending"
    )

    accept_event!(workspace, notification_app, environment, start_at, status: "pending")
    accept_event!(workspace, notification_app, environment, as_of, status: "pending")

    assert {:ok, analytics} = DeliveryAnalytics.query(workspace, "24h", %{}, as_of)
    assert analytics.totals.counts.accepted == 1
    assert hd(analytics.trend).counts.accepted == 1
    assert Enum.sum(Enum.map(analytics.trend, & &1.counts.accepted)) == 1
  end

  test "requires tenant-safe app and environment scope" do
    membership = insert(:membership)
    workspace = membership.workspace
    notification_app = create_app!(workspace, "Scoped")
    development = environment(notification_app, "development")
    production = environment(notification_app, "production")
    other_membership = insert(:membership)
    other_app = create_app!(other_membership.workspace, "Other tenant")
    other_environment = environment(other_app, "development")
    as_of = ~U[2026-08-12 12:00:00Z]

    accept_event!(workspace, notification_app, development, DateTime.add(as_of, -2 * 60 * 60),
      status: "pending"
    )

    accept_event!(workspace, notification_app, production, DateTime.add(as_of, -60 * 60),
      status: "published",
      publication_latency_seconds: 2
    )

    accept_event!(
      other_membership.workspace,
      other_app,
      other_environment,
      DateTime.add(as_of, -60 * 60),
      status: "pending"
    )

    assert {:ok, app_analytics} =
             DeliveryAnalytics.query(
               workspace,
               "24h",
               %{notification_app_id: notification_app.id},
               as_of
             )

    assert app_analytics.totals.counts.accepted == 2

    assert {:ok, environment_analytics} =
             DeliveryAnalytics.query(
               workspace,
               "24h",
               %{
                 notification_app_id: notification_app.id,
                 app_environment_id: production.id
               },
               as_of
             )

    assert environment_analytics.totals.counts.accepted == 1
    assert environment_analytics.totals.counts.published == 1

    assert {:error, :invalid_scope} =
             DeliveryAnalytics.query(
               workspace,
               "24h",
               %{app_environment_id: production.id},
               as_of
             )

    assert {:error, :not_found} =
             DeliveryAnalytics.query(
               workspace,
               "24h",
               %{notification_app_id: other_app.id},
               as_of
             )
  end

  defp create_app!(workspace, name) do
    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: name})

    notification_app
  end

  defp environment(notification_app, slug) do
    Enum.find(notification_app.environments, &(&1.environment_slug == slug))
  end

  defp accept_event!(workspace, notification_app, environment, accepted_at, options) do
    nonce = Ecto.UUID.generate()

    source = %{
      workspace_id: workspace.id,
      notification_app_id: notification_app.id,
      app_environment_id: environment.id,
      source_kind: "dashboard_test"
    }

    attrs = %{
      event_name: "analytics.sample",
      recipient_id: "recipient_#{nonce}",
      payload: %{"sample" => true},
      idempotency_key_digest: digest("idempotency-#{nonce}"),
      request_fingerprint: digest("request-#{nonce}")
    }

    assert {:ok, %{outbox: outbox}} =
             NotificationIngress.accept_event(source, attrs, accepted_at)

    status = Keyword.fetch!(options, :status)

    outbox_attrs =
      case status do
        "published" ->
          latency_seconds = Keyword.fetch!(options, :publication_latency_seconds)

          %{
            status: status,
            published_at: DateTime.add(accepted_at, latency_seconds, :second)
          }

        "processing" ->
          %{status: status, processing_at: accepted_at, processing_token: Ecto.UUID.generate()}

        "pending" ->
          %{status: status}
      end

    outbox
    |> EventOutbox.changeset(outbox_attrs)
    |> Repo.update!()
  end

  defp digest(value), do: :crypto.hash(:sha256, value)
end
