defmodule Api.NotificationDeliveryTest do
  use Api.DataCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationDelivery
  alias Api.NotificationIngress
  alias Api.NotificationIngress.EventOutbox

  setup do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{name: "Payments"})

    environment =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, %{server_api_key: server_api_key}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               environment.id,
               %{name: "Delivery key"}
             )

    source = %{
      workspace_id: membership.workspace_id,
      notification_app_id: notification_app.id,
      app_environment_id: environment.id,
      source_kind: "public_api",
      source_server_api_key_id: server_api_key.id
    }

    attrs = %{
      event_name: "invoice.payment_failed",
      recipient_id: "user_123",
      payload: %{"invoiceId" => "inv_123"},
      metadata: %{"source" => "billing"},
      idempotency_key_digest: digest("delivery-key"),
      request_fingerprint: digest("delivery-request")
    }

    %{source: source, attrs: attrs, environment: environment, notification_app: notification_app}
  end

  test "derives a scoped recipient topic", %{
    source: source,
    environment: environment,
    notification_app: notification_app
  } do
    assert NotificationDelivery.topic(Map.put(source, :recipient_id, "user_123")) ==
             "tenant:#{source.workspace_id}:app:#{notification_app.id}:environment:#{environment.id}:recipient:user_123"
  end

  test "broadcasts the safe envelope and marks the handoff published", %{
    source: source,
    attrs: attrs
  } do
    accepted_at = DateTime.add(DateTime.utc_now(:second), -1, :second)

    assert {:ok, %{outbox: outbox, event: event}} =
             NotificationIngress.accept_event(source, attrs, accepted_at)

    topic = NotificationDelivery.topic(Map.put(source, :recipient_id, event.recipient_id))
    Phoenix.PubSub.subscribe(Api.PubSub, topic)

    assert :ok = NotificationDelivery.publish(outbox.id)
    assert_receive %{event: "notification.created", data: %{eventId: event_id}}
    assert event_id == event.id

    assert Repo.get!(EventOutbox, outbox.id).status == "published"
  end

  test "does not publish an already claimed handoff", %{source: source, attrs: attrs} do
    assert {:ok, %{outbox: outbox}} = NotificationIngress.accept_event(source, attrs)

    assert {:ok, _outbox} =
             outbox
             |> EventOutbox.changeset(%{status: "processing", processing_at: DateTime.utc_now()})
             |> Repo.update()

    assert {:error, :not_publishable} = NotificationDelivery.publish(outbox.id)
    assert Repo.get!(EventOutbox, outbox.id).status == "processing"
  end

  test "retries stale processing handoffs", %{source: source, attrs: attrs} do
    accepted_at = DateTime.add(DateTime.utc_now(:second), -2, :second)

    assert {:ok, %{outbox: outbox, event: event}} =
             NotificationIngress.accept_event(source, attrs, accepted_at)

    stale_at = DateTime.add(DateTime.utc_now(:second), -61, :second)

    assert {:ok, _outbox} =
             outbox
             |> EventOutbox.changeset(%{status: "processing", processing_at: stale_at})
             |> Repo.update()

    topic = NotificationDelivery.topic(Map.put(source, :recipient_id, event.recipient_id))
    Phoenix.PubSub.subscribe(Api.PubSub, topic)

    assert :ok = NotificationDelivery.publish_next()
    assert_receive %{event: "notification.created", data: %{eventId: event_id}}
    assert event_id == event.id
    assert Repo.get!(EventOutbox, outbox.id).status == "published"
  end

  defp digest(value), do: :crypto.hash(:sha256, value)
end
