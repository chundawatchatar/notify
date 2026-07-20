defmodule Api.Repo.Migrations.AddWorkspaceInvitationsAndMembershipLifecycle do
  use Ecto.Migration

  def up do
    alter table(:workspace_memberships) do
      add :status, :string, null: false, default: "active"
      add :joined_at, :utc_datetime
      add :removed_at, :utc_datetime
    end

    execute "UPDATE workspace_memberships SET joined_at = inserted_at WHERE joined_at IS NULL"
    alter table(:workspace_memberships), do: modify(:joined_at, :utc_datetime, null: false)

    create constraint(:workspace_memberships, :workspace_memberships_status,
             check: "status IN ('active', 'removed')"
           )

    create index(:workspace_memberships, [:workspace_id, :status])

    create table(:workspace_invitations, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :workspace_id, references(:workspaces, type: :binary_id, on_delete: :delete_all),
        null: false

      add :email, :string, null: false
      add :role, :string, null: false

      add :invited_by_membership_id,
          references(:workspace_memberships, type: :binary_id, on_delete: :nothing),
          null: false

      add :token_hash, :binary, null: false
      add :expires_at, :utc_datetime, null: false
      add :accepted_at, :utc_datetime
      add :revoked_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:workspace_invitations, [:token_hash])

    create unique_index(:workspace_invitations, [:workspace_id, :email],
             where: "accepted_at IS NULL AND revoked_at IS NULL",
             name: :workspace_invitations_pending_workspace_email_index
           )

    create index(:workspace_invitations, [:workspace_id])
    create index(:workspace_invitations, [:expires_at])

    create constraint(:workspace_invitations, :workspace_invitations_email_normalized,
             check: "email = lower(btrim(email))"
           )

    create constraint(:workspace_invitations, :workspace_invitations_email_length,
             check: "char_length(email) BETWEEN 3 AND 160"
           )

    create constraint(:workspace_invitations, :workspace_invitations_role,
             check: "role IN ('owner', 'admin', 'developer', 'viewer')"
           )

    replace_owner_trigger("AND status = 'active'")
  end

  def down do
    drop table(:workspace_invitations)
    drop index(:workspace_memberships, [:workspace_id, :status])
    drop constraint(:workspace_memberships, :workspace_memberships_status)

    alter table(:workspace_memberships) do
      remove :removed_at
      remove :joined_at
      remove :status
    end

    replace_owner_trigger("")
  end

  defp replace_owner_trigger(status_clause) do
    execute "DROP TRIGGER workspace_memberships_owner_required ON workspace_memberships"
    execute "DROP FUNCTION enforce_workspace_owner()"

    execute """
    CREATE FUNCTION enforce_workspace_owner() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM 1 FROM workspaces WHERE id = OLD.workspace_id FOR UPDATE;
      ELSIF TG_OP = 'INSERT' THEN
        PERFORM 1 FROM workspaces WHERE id = NEW.workspace_id FOR UPDATE;
      ELSE
        PERFORM 1 FROM workspaces WHERE id IN (OLD.workspace_id, NEW.workspace_id) ORDER BY id FOR UPDATE;
      END IF;

      IF TG_OP IN ('UPDATE', 'DELETE') AND EXISTS (SELECT 1 FROM workspaces WHERE id = OLD.workspace_id) AND NOT EXISTS (
        SELECT 1 FROM workspace_memberships WHERE workspace_id = OLD.workspace_id AND role = 'owner' #{status_clause}
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'workspace_memberships_owner_required', MESSAGE = 'workspace must retain at least one owner';
      END IF;

      IF TG_OP IN ('INSERT', 'UPDATE') AND EXISTS (SELECT 1 FROM workspaces WHERE id = NEW.workspace_id) AND NOT EXISTS (
        SELECT 1 FROM workspace_memberships WHERE workspace_id = NEW.workspace_id AND role = 'owner' #{status_clause}
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'workspace_memberships_owner_required', MESSAGE = 'workspace must retain at least one owner';
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
    """

    execute """
    CREATE CONSTRAINT TRIGGER workspace_memberships_owner_required
    AFTER INSERT OR UPDATE OR DELETE ON workspace_memberships
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION enforce_workspace_owner()
    """
  end
end
