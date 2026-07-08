defmodule Domain.NotificationTest do
  use ExUnit.Case, async: true

  alias Domain.Notification

  test "builds a notification domain struct" do
    created_at = DateTime.utc_now()

    notification = %Notification{
      id: "notification_1",
      template_id: "template_1",
      channel: :email,
      status: :queued,
      recipient: %{id: "recipient_1"},
      created_at: created_at
    }

    assert notification.id == "notification_1"
    assert notification.created_at == created_at
  end
end
