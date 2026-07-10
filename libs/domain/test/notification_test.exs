defmodule Domain.NotificationTest do
  use ExUnit.Case, async: true

  alias Domain.Notification

  describe "new/1" do
    test "builds a notification domain struct from atom keys" do
      created_at = DateTime.utc_now()

      assert {:ok, notification} =
               Notification.new(%{
                 id: "notification_1",
                 tenant_id: "tenant_1",
                 template_id: "template_1",
                 channel: :email,
                 status: :queued,
                 recipient: %{id: "recipient_1"},
                 payload: %{subject: "Hello"},
                 metadata: %{source: "test"},
                 created_at: created_at
               })

      assert notification.id == "notification_1"
      assert notification.tenant_id == "tenant_1"
      assert notification.created_at == created_at
      assert notification.payload == %{subject: "Hello"}
    end

    test "normalizes channel and status from string keys" do
      assert {:ok, notification} =
               Notification.new(%{
                 "id" => "notification_1",
                 "tenant_id" => "tenant_1",
                 "template_id" => "template_1",
                 "channel" => "in_app",
                 "status" => "draft",
                 "recipient" => %{"id" => "recipient_1"}
               })

      assert notification.channel == :in_app
      assert notification.status == :draft
    end

    test "returns validation errors for missing business fields" do
      assert {:error, errors} = Notification.new(%{})

      assert {:id, :required} in errors
      assert {:tenant_id, :required} in errors
      assert {:template_id, :required} in errors
      assert {:recipient, :required} in errors
      assert {:recipient_id, :required} in errors
      assert {:channel, {:invalid, allowed: Notification.channels()}} in errors
    end

    test "requires delivered timestamps and failure reasons for terminal states" do
      base_attrs = %{
        id: "notification_1",
        tenant_id: "tenant_1",
        template_id: "template_1",
        channel: :email,
        recipient: %{id: "recipient_1"}
      }

      assert {:error, delivered_errors} =
               Notification.new(Map.put(base_attrs, :status, :delivered))

      assert {:delivered_at, :required} in delivered_errors

      assert {:error, failed_errors} = Notification.new(Map.put(base_attrs, :status, :failed))
      assert {:failure_reason, :required} in failed_errors
    end
  end

  describe "status helpers" do
    test "knows supported channels and statuses" do
      assert Notification.valid_channel?(:email)
      assert Notification.valid_channel?("push")
      refute Notification.valid_channel?(:fax)

      assert Notification.valid_status?(:queued)
      assert Notification.valid_status?("delivered")
      refute Notification.valid_status?(:unknown)
    end

    test "knows terminal statuses" do
      assert Notification.terminal_status?(:delivered)
      assert Notification.terminal_status?(:failed)
      assert Notification.terminal_status?(:cancelled)
      refute Notification.terminal_status?(:queued)
    end
  end

  describe "lifecycle transitions" do
    setup do
      notification =
        %Notification{
          id: "notification_1",
          tenant_id: "tenant_1",
          template_id: "template_1",
          channel: :email,
          status: :draft,
          recipient: %{id: "recipient_1"},
          created_at: DateTime.utc_now()
        }

      %{notification: notification}
    end

    test "allows the happy-path notification lifecycle", %{notification: notification} do
      delivered_at = DateTime.utc_now()

      assert {:ok, queued} = Notification.queue(notification)
      assert {:ok, sent} = Notification.mark_sent(queued)
      assert {:ok, delivered} = Notification.mark_delivered(sent, delivered_at)

      assert delivered.status == :delivered
      assert delivered.delivered_at == delivered_at
      assert Notification.terminal_status?(delivered.status)
    end

    test "allows queued notifications to fail", %{notification: notification} do
      assert {:ok, queued} = Notification.queue(notification)
      assert {:ok, failed} = Notification.mark_failed(queued, "provider rejected message")

      assert failed.status == :failed
      assert failed.failure_reason == "provider rejected message"
    end

    test "rejects invalid transitions", %{notification: notification} do
      assert {:error, errors} = Notification.mark_delivered(notification, DateTime.utc_now())

      assert [
               status: {:invalid_transition, from: :draft, to: :delivered}
             ] = errors
    end
  end
end
