defmodule Api.Repo.Migrations.AddDeliveryPublishTimestamps do
  use Ecto.Migration

  def change do
    alter table(:notification_event_outbox) do
      add :processing_at, :utc_datetime
      add :published_at, :utc_datetime
    end
  end
end
