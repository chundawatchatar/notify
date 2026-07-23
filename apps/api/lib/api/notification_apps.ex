defmodule Api.NotificationApps do
  @moduledoc """
  Workspace-scoped notification app persistence and default environment creation.
  """

  import Ecto.Query

  alias Api.NotificationApps.{ClientKey, Environment, NotificationApp, TrustedOrigin}
  alias Api.Repo
  alias Api.Workspaces.Workspace
  alias Ecto.Multi

  @doc """
  Lists active notification apps owned by the current workspace.
  """
  def list_notification_apps(%Workspace{id: workspace_id}) do
    preloads = notification_app_readiness_preloads()

    Repo.all(
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            is_nil(notification_app.archived_at),
        order_by: [asc: notification_app.inserted_at, asc: notification_app.id],
        preload: ^preloads
    )
  end

  @doc """
  Gets an active notification app by ID only when it belongs to the current workspace.
  """
  def get_notification_app(%Workspace{id: workspace_id}, notification_app_id) do
    with {:ok, notification_app_id} <- Ecto.UUID.cast(notification_app_id) do
      preloads = notification_app_readiness_preloads()

      Repo.one(
        from notification_app in NotificationApp,
          where:
            notification_app.id == ^notification_app_id and
              notification_app.workspace_id == ^workspace_id and
              is_nil(notification_app.archived_at),
          preload: ^preloads
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
    preloads = notification_app_readiness_preloads()

    Repo.one(
      from notification_app in NotificationApp,
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug and
            is_nil(notification_app.archived_at),
        preload: ^preloads
    )
  end

  def get_notification_app_by_slug(_, _), do: nil

  @doc """
  Gets an environment only when its app belongs to the current workspace.
  """
  def get_environment_by_slugs(%Workspace{id: workspace_id}, app_slug, environment_slug)
      when is_binary(app_slug) and is_binary(environment_slug) do
    Repo.one(
      from environment in Environment,
        join: notification_app in assoc(environment, :notification_app),
        where:
          notification_app.workspace_id == ^workspace_id and
            notification_app.app_slug == ^app_slug and
            environment.environment_slug == ^environment_slug
    )
  end

  def get_environment_by_slugs(_, _, _), do: nil

  @doc """
  Lists all client keys for an environment, including revoked identifiers.
  """
  def list_client_keys(%Environment{id: environment_id}) do
    Repo.all(
      from client_key in ClientKey,
        where: client_key.app_environment_id == ^environment_id,
        order_by: [asc: client_key.inserted_at, asc: client_key.id]
    )
  end

  @doc """
  Creates a high-entropy client identifier for an environment.
  """
  def create_client_key(%Environment{id: environment_id}) do
    %ClientKey{}
    |> ClientKey.changeset(%{app_environment_id: environment_id, key: ClientKey.generate()})
    |> Repo.insert()
  end

  @doc """
  Revokes an active client key only when it belongs to the current environment.
  """
  def revoke_client_key(%Environment{id: environment_id}, client_key_id) do
    with {:ok, client_key_id} <- Ecto.UUID.cast(client_key_id),
         %ClientKey{} = client_key <-
           Repo.one(
             from client_key in ClientKey,
               where:
                 client_key.app_environment_id == ^environment_id and
                   client_key.id == ^client_key_id and
                   is_nil(client_key.revoked_at)
           ) do
      client_key
      |> Ecto.Changeset.change(revoked_at: DateTime.utc_now(:second))
      |> Repo.update()
    else
      :error -> :not_found
      nil -> :not_found
    end
  end

  @doc """
  Lists trusted origins for an environment in a stable order.
  """
  def list_trusted_origins(%Environment{id: environment_id}) do
    Repo.all(
      from trusted_origin in TrustedOrigin,
        where: trusted_origin.app_environment_id == ^environment_id,
        order_by: [asc: trusted_origin.origin, asc: trusted_origin.id]
    )
  end

  @doc """
  Adds a normalized exact origin to an environment.
  """
  def create_trusted_origin(%Environment{id: environment_id}, attrs) when is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    %TrustedOrigin{}
    |> TrustedOrigin.changeset(Map.put(attrs, "app_environment_id", environment_id))
    |> Repo.insert()
  end

  def create_trusted_origin(_, _), do: {:error, :invalid_environment}

  @doc """
  Removes a trusted origin only when it belongs to the current environment.
  """
  def remove_trusted_origin(%Environment{id: environment_id}, trusted_origin_id) do
    with {:ok, trusted_origin_id} <- Ecto.UUID.cast(trusted_origin_id),
         %TrustedOrigin{} = trusted_origin <-
           Repo.one(
             from trusted_origin in TrustedOrigin,
               where:
                 trusted_origin.app_environment_id == ^environment_id and
                   trusted_origin.id == ^trusted_origin_id
           ) do
      Repo.delete(trusted_origin)
    else
      :error -> :not_found
      nil -> :not_found
    end
  end

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
    do: {:ok, Repo.preload(notification_app, notification_app_readiness_preloads())}

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
    do: {:ok, Repo.preload(notification_app, notification_app_readiness_preloads())}

  defp normalize_update_result({:error, {:invalid, changeset}}), do: {:error, changeset}
  defp normalize_update_result({:error, :not_found}), do: {:error, :not_found}

  defp normalize_archive_result({:ok, _notification_app}), do: :ok
  defp normalize_archive_result({:error, :not_found}), do: {:error, :not_found}
  defp normalize_archive_result({:error, :archived}), do: {:error, :archived}

  defp notification_app_readiness_preloads do
    active_client_keys =
      from client_key in ClientKey,
        where: is_nil(client_key.revoked_at)

    [environments: [{:client_keys, active_client_keys}, :trusted_origins]]
  end
end
