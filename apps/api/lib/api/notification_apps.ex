defmodule Api.NotificationApps do
  @moduledoc """
  Workspace-scoped notification app persistence and default environment creation.
  """

  import Ecto.Query

  alias Api.NotificationApps.{Environment, NotificationApp}
  alias Api.Repo
  alias Api.Workspaces.Workspace
  alias Ecto.Multi

  @doc """
  Lists notification apps owned by the current workspace.
  """
  def list_notification_apps(%Workspace{id: workspace_id}) do
    Repo.all(
      from notification_app in NotificationApp,
        where: notification_app.workspace_id == ^workspace_id,
        order_by: [asc: notification_app.inserted_at, asc: notification_app.id],
        preload: [:environments]
    )
  end

  @doc """
  Gets a notification app by ID only when it belongs to the current workspace.
  """
  def get_notification_app(%Workspace{id: workspace_id}, notification_app_id) do
    with {:ok, notification_app_id} <- Ecto.UUID.cast(notification_app_id) do
      Repo.one(
        from notification_app in NotificationApp,
          where:
            notification_app.id == ^notification_app_id and
              notification_app.workspace_id == ^workspace_id,
          preload: [:environments]
      )
    else
      :error -> nil
    end
  end

  @doc """
  Gets a notification app by slug only when it belongs to the current workspace.
  """
  def get_notification_app_by_slug(%Workspace{id: workspace_id}, app_slug)
      when is_binary(app_slug) do
    Repo.one(
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug,
        preload: [:environments]
    )
  end

  def get_notification_app_by_slug(_, _), do: nil

  @doc """
  Creates a notification app and its Development and Production environments atomically.
  """
  def create_notification_app(%Workspace{} = workspace, attrs) when is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    Multi.new()
    |> Multi.run(:app_slug, fn repo, _changes ->
      NotificationApp.next_available_slug(repo, workspace.id, attrs["name"])
    end)
    |> Multi.insert(:notification_app, fn %{app_slug: app_slug} ->
      NotificationApp.changeset(%NotificationApp{}, %{
        workspace_id: workspace.id,
        name: attrs["name"],
        app_slug: app_slug
      })
    end)
    |> Multi.insert(:development_environment, fn %{notification_app: notification_app} ->
      Environment.changeset(%Environment{}, %{
        notification_app_id: notification_app.id,
        name: "Development",
        environment_slug: "development",
        production: false
      })
    end)
    |> Multi.insert(:production_environment, fn %{notification_app: notification_app} ->
      Environment.changeset(%Environment{}, %{
        notification_app_id: notification_app.id,
        name: "Production",
        environment_slug: "production",
        production: true
      })
    end)
    |> Repo.transaction()
    |> normalize_creation_result()
  end

  def create_notification_app(_, _), do: {:error, :invalid_workspace}

  defp normalize_creation_result({:ok, %{notification_app: notification_app}}),
    do: {:ok, Repo.preload(notification_app, :environments)}

  defp normalize_creation_result({:error, _operation, changeset, _changes})
       when is_struct(changeset, Ecto.Changeset),
       do: {:error, changeset}

  defp normalize_creation_result({:error, operation, reason, _changes}),
    do: {:error, operation, reason}
end
