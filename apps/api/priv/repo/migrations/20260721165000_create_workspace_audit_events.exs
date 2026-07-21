defmodule Api.Repo.Migrations.CreateWorkspaceAuditEvents do
  use Ecto.Migration

  def change do
    create table(:workspace_audit_events, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workspace_id, references(:workspaces, type: :binary_id, on_delete: :delete_all),
        null: false

      add :actor_workspace_membership_id,
          references(:workspace_memberships, type: :binary_id, on_delete: :nothing)

      add :action, :string, null: false
      add :target_type, :string, null: false
      add :target_id, :binary_id
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:workspace_audit_events, [:workspace_id, :inserted_at])
    create index(:workspace_audit_events, [:actor_workspace_membership_id])

    create constraint(:workspace_audit_events, :workspace_audit_events_action_length,
             check: "char_length(action) BETWEEN 1 AND 80"
           )

    create constraint(:workspace_audit_events, :workspace_audit_events_target_type_length,
             check: "char_length(target_type) BETWEEN 1 AND 80"
           )
  end
end
