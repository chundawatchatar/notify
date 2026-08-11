defmodule Api.NotificationDeliveryTest do
  use Api.DataCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationDelivery
  alias Api.NotificationDelivery.ClaimLease
  alias Api.NotificationDelivery.Publisher
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

  test "does not recover a claim whose active publisher renewed its lease", %{
    source: source,
    attrs: attrs
  } do
    assert {:ok, %{outbox: outbox}} = NotificationIngress.accept_event(source, attrs)
    assert {:ok, claimed} = ClaimLease.claim(outbox.id)
    assert {:ok, lease} = ClaimLease.start(claimed, heartbeat_interval: 60_000)

    after_timeout = DateTime.add(claimed.processing_at, 61, :second)

    assert :ok = ClaimLease.renew(lease, after_timeout)
    assert :empty = NotificationDelivery.publish_next(after_timeout)

    persisted = Repo.get!(EventOutbox, outbox.id)
    assert persisted.status == "processing"
    assert persisted.processing_at == after_timeout
    assert persisted.processing_token == claimed.processing_token

    assert {:error, :test_cleanup} = ClaimLease.release(lease, :test_cleanup)
  end

  test "claim loss does not terminate the lease owner", %{source: source, attrs: attrs} do
    assert {:ok, %{outbox: outbox}} = NotificationIngress.accept_event(source, attrs)
    parent = self()

    {owner, owner_ref} =
      spawn_monitor(fn ->
        {:ok, claimed} = ClaimLease.claim(outbox.id)
        {:ok, lease} = ClaimLease.start(claimed, heartbeat_interval: 60_000)
        send(parent, {:lease_ready, self(), claimed, lease})

        receive do
          {:renew, now} ->
            result = ClaimLease.renew(lease, now)

            lease_failure =
              receive do
                {ClaimLease, ^lease, {:error, _reason}} = failure -> failure
              end

            send(parent, {:renewed, self(), result, lease_failure})
        end
      end)

    assert_receive {:lease_ready, ^owner, claimed, lease}

    assert {1, _} =
             Repo.update_all(
               from(current in EventOutbox, where: current.id == ^outbox.id),
               set: [status: "pending", processing_at: nil, processing_token: nil]
             )

    send(owner, {:renew, DateTime.add(claimed.processing_at, 61, :second)})

    assert_receive {:renewed, ^owner, {:error, :claim_lost}, lease_failure}
    assert lease_failure == {ClaimLease, lease, {:error, :claim_lost}}
    assert_receive {:DOWN, ^owner_ref, :process, ^owner, :normal}
  end

  test "publisher retries stale processing handoffs", %{source: source, attrs: attrs} do
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

    publisher = start_supervised!({Publisher, interval: 60_000})
    send(publisher, :publish)

    assert_receive %{event: "notification.created", data: %{eventId: event_id}}
    assert event_id == event.id
    :sys.get_state(publisher)
    assert Repo.get!(EventOutbox, outbox.id).status == "published"
  end

  defp digest(value), do: :crypto.hash(:sha256, value)
end
