defmodule Api.Repo.Migrations.AddOutboxProcessingToken do
  use Ecto.Migration

  def change do
    alter table(:notification_event_outbox) do
      add :processing_token, :uuid
    end
  end
end
