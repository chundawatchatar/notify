defmodule Api.Repo.Migrations.AddWorkspaceTimezone do
  use Ecto.Migration

  def change do
    alter table(:workspaces) do
      add :timezone, :string, null: false, default: "UTC"
    end

    create constraint(:workspaces, :workspaces_timezone_length,
             check: "timezone = btrim(timezone) AND char_length(timezone) BETWEEN 1 AND 255"
           )
  end
end
