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
  Lists active notification apps owned by the current workspace.
  """
  def list_notification_apps(%Workspace{id: workspace_id}) do
    Repo.all(
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            is_nil(notification_app.archived_at),
        order_by: [asc: notification_app.inserted_at, asc: notification_app.id],
        preload: [:environments]
    )
  end

  @doc """
  Gets an active notification app by ID only when it belongs to the current workspace.
  """
  def get_notification_app(%Workspace{id: workspace_id}, notification_app_id) do
    with {:ok, notification_app_id} <- Ecto.UUID.cast(notification_app_id) do
      Repo.one(
        from notification_app in NotificationApp,
          where:
            notification_app.id == ^notification_app_id and
              notification_app.workspace_id == ^workspace_id and
              is_nil(notification_app.archived_at),
          preload: [:environments]
      )
    else
      :error -> nil
    end
  end

  @doc """
  Gets an active notification app by slug only when it belongs to the current workspace.
  """
  def get_notification_app_by_slug(%Workspace{id: workspace_id}, app_slug)
      when is_binary(app_slug) do
    Repo.one(
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug and
            is_nil(notification_app.archived_at),
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

  @doc """
  Updates an active notification app's display name while preserving its slug.
  """
  def update_notification_app(%Workspace{} = workspace, app_slug, attrs)
      when is_binary(app_slug) and is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    with_active_notification_app(workspace.id, app_slug, fn notification_app ->
      case notification_app |> NotificationApp.update_changeset(attrs) |> Repo.update() do
        {:ok, updated_notification_app} -> updated_notification_app
        {:error, changeset} -> Repo.rollback({:invalid, changeset})
      end
    end)
  end

  def update_notification_app(_, _, _), do: {:error, :not_found}

  @doc """
  Soft-archives a notification app in the current workspace.
  """
  def archive_notification_app(%Workspace{} = workspace, app_slug) when is_binary(app_slug) do
    Repo.transaction(fn ->
      case Repo.one(
             notification_app_query(workspace.id, app_slug, include_archived: true, lock: true)
           ) do
        nil ->
          Repo.rollback(:not_found)

        %{archived_at: archived_at} when not is_nil(archived_at) ->
          Repo.rollback(:archived)

        notification_app ->
          notification_app
          |> Ecto.Changeset.change(archived_at: DateTime.utc_now() |> DateTime.truncate(:second))
          |> Repo.update!()
      end
    end)
    |> normalize_archive_result()
  end

  def archive_notification_app(_, _), do: {:error, :not_found}

  defp normalize_creation_result({:ok, %{notification_app: notification_app}}),
    do: {:ok, Repo.preload(notification_app, :environments)}

  defp normalize_creation_result({:error, _operation, changeset, _changes})
       when is_struct(changeset, Ecto.Changeset),
       do: {:error, changeset}

  defp normalize_creation_result({:error, operation, reason, _changes}),
    do: {:error, operation, reason}

  defp with_active_notification_app(workspace_id, app_slug, callback) do
    Repo.transaction(fn ->
      case Repo.one(notification_app_query(workspace_id, app_slug, lock: true)) do
        nil -> Repo.rollback(:not_found)
        notification_app -> callback.(notification_app)
      end
    end)
    |> normalize_update_result()
  end

  defp notification_app_query(workspace_id, app_slug, options) do
    query =
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug

    query =
      if Keyword.get(options, :include_archived, false),
        do: query,
        else: from(notification_app in query, where: is_nil(notification_app.archived_at))

    if Keyword.get(options, :lock, false),
      do: lock(query, "FOR UPDATE"),
      else: query
  end

  defp normalize_update_result({:ok, notification_app}),
    do: {:ok, Repo.preload(notification_app, :environments)}

  defp normalize_update_result({:error, {:invalid, changeset}}), do: {:error, changeset}
  defp normalize_update_result({:error, :not_found}), do: {:error, :not_found}

  defp normalize_archive_result({:ok, _notification_app}), do: :ok
  defp normalize_archive_result({:error, :not_found}), do: {:error, :not_found}
  defp normalize_archive_result({:error, :archived}), do: {:error, :archived}
end
