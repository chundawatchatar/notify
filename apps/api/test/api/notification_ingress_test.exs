defmodule Api.NotificationIngressTest do
  use Api.DataCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationIngress
  alias Api.NotificationIngress.{EventOutbox, IdempotencyKey, NotificationEvent}

  setup do
    membership = insert(:membership)

    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(membership.workspace, %{
               name: "Payments Service"
             })

    development =
      Enum.find(notification_app.environments, &(&1.environment_slug == "development"))

    assert {:ok, %{server_api_key: server_api_key}} =
             NotificationApps.create_server_api_key(
               membership,
               notification_app.id,
               development.id,
               %{name: "Ingest Worker"}
             )

    source = %{
      workspace_id: membership.workspace_id,
      notification_app_id: notification_app.id,
      app_environment_id: development.id,
      source_kind: "public_api",
      source_server_api_key_id: server_api_key.id
    }

    attrs = %{
      event_name: "invoice.payment_failed",
      recipient_id: "user_123",
      payload: %{"invoiceId" => "inv_123", "amountDue" => 2400},
      metadata: %{"source" => "billing"},
      idempotency_key_digest: digest("idempotency-key"),
      request_fingerprint: digest("request-v1")
    }

    %{attrs: attrs, source: source, now: ~U[2026-08-05 10:00:00Z]}
  end

  test "persists the event, idempotency record, and pending outbox row atomically", %{
    attrs: attrs,
    source: source,
    now: now
  } do
    assert {:ok,
            %{duplicate: false, event: event, idempotency_key: idempotency_key, outbox: outbox}} =
             NotificationIngress.accept_event(source, attrs, now)

    assert event.workspace_id == source.workspace_id
    assert event.notification_app_id == source.notification_app_id
    assert event.app_environment_id == source.app_environment_id
    assert event.source_server_api_key_id == source.source_server_api_key_id
    assert event.accepted_at == now
    assert event.payload_size == byte_size(Jason.encode!(attrs.payload))

    assert Repo.get!(NotificationEvent, event.id).id == event.id
    assert Repo.get!(IdempotencyKey, idempotency_key.id).notification_event_id == event.id
    assert Repo.get!(EventOutbox, outbox.id).status == "pending"
  end

  test "replays a matching active idempotency key without creating another event", %{
    attrs: attrs,
    source: source,
    now: now
  } do
    assert {:ok, %{event: first_event, duplicate: false}} =
             NotificationIngress.accept_event(source, attrs, now)

    assert {:ok, %{event: duplicate_event, duplicate: true}} =
             NotificationIngress.accept_event(source, attrs, DateTime.add(now, 1, :second))

    assert duplicate_event.id == first_event.id
    assert Repo.aggregate(NotificationEvent, :count, :id) == 1
    assert Repo.aggregate(IdempotencyKey, :count, :id) == 1
    assert Repo.aggregate(EventOutbox, :count, :id) == 1
  end

  test "rejects an idempotency replay with a different request fingerprint", %{
    attrs: attrs,
    source: source,
    now: now
  } do
    assert {:ok, _result} = NotificationIngress.accept_event(source, attrs, now)

    conflicting_attrs = %{attrs | request_fingerprint: digest("request-v2")}

    assert {:error, :idempotency_key_conflict} =
             NotificationIngress.accept_event(source, conflicting_attrs, now)

    assert Repo.aggregate(NotificationEvent, :count, :id) == 1
    assert Repo.aggregate(EventOutbox, :count, :id) == 1
  end

  test "rejects a source whose environment is owned by another workspace", %{
    attrs: attrs,
    source: source,
    now: now
  } do
    other_workspace = insert(:workspace)

    mismatched_source = %{source | workspace_id: other_workspace.id}

    assert {:error, :invalid_source} =
             NotificationIngress.accept_event(mismatched_source, attrs, now)

    assert Repo.aggregate(NotificationEvent, :count, :id) == 0
    assert Repo.aggregate(IdempotencyKey, :count, :id) == 0
    assert Repo.aggregate(EventOutbox, :count, :id) == 0
  end

  defp digest(value), do: :crypto.hash(:sha256, value)
end
