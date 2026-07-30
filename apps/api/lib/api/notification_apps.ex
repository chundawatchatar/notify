defmodule Api.NotificationApps do
  @moduledoc """
  Workspace-scoped notification app persistence and default environment creation.
  """

  import Ecto.Query

  alias Api.NotificationApps.{
    ClientKey,
    Environment,
    NotificationApp,
    ServerApiKey,
    TrustedOrigin
  }

  alias Api.Repo
  alias Api.Workspaces.{AuditEvent, Membership, Workspace}
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
  Gets an environment by UUIDs only when its app belongs to the current workspace.
  """
  def get_environment_by_ids(%Workspace{id: workspace_id}, notification_app_id, environment_id) do
    with {:ok, notification_app_id} <- Ecto.UUID.cast(notification_app_id),
         {:ok, environment_id} <- Ecto.UUID.cast(environment_id) do
      Repo.one(
        from environment in Environment,
          join: notification_app in assoc(environment, :notification_app),
          where:
            notification_app.id == ^notification_app_id and
              notification_app.workspace_id == ^workspace_id and
              environment.id == ^environment_id and
              is_nil(notification_app.archived_at)
      )
    else
      :error -> nil
    end
  end

  def get_environment_by_ids(_, _, _), do: nil

  @doc """
  Lists all server API keys for an environment in stable order without digest disclosure.
  """
  def list_server_api_keys(%Workspace{} = workspace, notification_app_id, environment_id) do
    case get_environment_by_ids(workspace, notification_app_id, environment_id) do
      %Environment{id: resolved_environment_id} ->
        server_api_keys =
          Repo.all(
            from server_api_key in ServerApiKey,
              where: server_api_key.app_environment_id == ^resolved_environment_id,
              order_by: [asc: server_api_key.inserted_at, asc: server_api_key.id]
          )

        {:ok, Enum.map(server_api_keys, &serialize_server_api_key/1)}

      nil ->
        {:error, :not_found}
    end
  end

  @doc """
  Creates a server API key for an environment and reveals the raw secret once.
  """
  def create_server_api_key(
        actor_membership,
        notification_app_id,
        environment_id,
        attrs,
        secret_generator \\ &ServerApiKey.generate/0
      )

  def create_server_api_key(
        %Membership{} = actor_membership,
        notification_app_id,
        environment_id,
        attrs,
        secret_generator
      )
      when is_map(attrs) do
    attrs = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    with {:ok, %Environment{} = environment} <-
           resolve_environment_for_membership(
             actor_membership,
             notification_app_id,
             environment_id
           ),
         {:ok, %{server_api_key: server_api_key, secret_material: %{secret: secret}}} <-
           Multi.new()
           |> Multi.run(:secret_material, fn _repo, _changes ->
             build_server_api_key_material(secret_generator)
           end)
           |> Multi.insert(:server_api_key, fn %{secret_material: secret_material} ->
             ServerApiKey.changeset(%ServerApiKey{}, %{
               app_environment_id: environment.id,
               name: attrs["name"],
               secret_digest: secret_material.secret_digest,
               masked_hint: secret_material.masked_hint
             })
           end)
           |> Multi.insert(:audit_event, fn %{server_api_key: server_api_key} ->
             audit_event_changeset(
               actor_membership,
               environment,
               "server_api_key_created",
               server_api_key.id,
               %{
                 "app_environment_id" => environment.id,
                 "name" => server_api_key.name
               }
             )
           end)
           |> Repo.transaction() do
      {:ok, %{server_api_key: serialize_server_api_key(server_api_key), secret: secret}}
    else
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, :not_found} -> {:error, :not_found}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end

  def create_server_api_key(_, _, _, _, _), do: {:error, :forbidden}

  @doc """
  Revokes an active server API key only when it belongs to the selected environment.
  """
  def revoke_server_api_key(
        %Membership{} = actor_membership,
        notification_app_id,
        environment_id,
        server_api_key_id
      ) do
    now = DateTime.utc_now(:second)

    with {:ok, %Environment{} = environment} <-
           resolve_environment_for_membership(
             actor_membership,
             notification_app_id,
             environment_id
           ),
         {:ok, %{server_api_key: revoked_server_api_key}} <-
           Multi.new()
           |> Multi.run(:server_api_key, fn repo, _changes ->
             with {:ok, server_api_key_id} <- Ecto.UUID.cast(server_api_key_id),
                  %ServerApiKey{} = server_api_key <-
                    repo.one(
                      from server_api_key in ServerApiKey,
                        where:
                          server_api_key.app_environment_id == ^environment.id and
                            server_api_key.id == ^server_api_key_id and
                            is_nil(server_api_key.revoked_at),
                        lock: "FOR UPDATE"
                    ) do
               {:ok, server_api_key}
             else
               :error -> {:error, :not_found}
               nil -> {:error, :not_found}
             end
           end)
           |> Multi.update(:server_api_key, fn %{server_api_key: server_api_key} ->
             Ecto.Changeset.change(server_api_key, revoked_at: now)
           end)
           |> Multi.insert(:audit_event, fn %{server_api_key: revoked_server_api_key} ->
             audit_event_changeset(
               actor_membership,
               environment,
               "server_api_key_revoked",
               revoked_server_api_key.id,
               %{
                 "app_environment_id" => environment.id,
                 "name" => revoked_server_api_key.name
               }
             )
           end)
           |> Repo.transaction() do
      {:ok, serialize_server_api_key(revoked_server_api_key)}
    else
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, :not_found} -> {:error, :not_found}
      :error -> {:error, :not_found}
      nil -> {:error, :not_found}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end

  def revoke_server_api_key(_, _, _, _), do: {:error, :forbidden}

  @doc """
  Rotates an active server API key atomically by revoking it and inserting a replacement.
  """
  def rotate_server_api_key(
        actor_membership,
        notification_app_id,
        environment_id,
        server_api_key_id,
        secret_generator \\ &ServerApiKey.generate/0
      )

  def rotate_server_api_key(
        %Membership{} = actor_membership,
        notification_app_id,
        environment_id,
        server_api_key_id,
        secret_generator
      ) do
    now = DateTime.utc_now(:second)

    with {:ok, %Environment{} = environment} <-
           resolve_environment_for_membership(
             actor_membership,
             notification_app_id,
             environment_id
           ),
         {:ok,
          %{
            replacement_server_api_key: replacement_server_api_key,
            secret_material: %{secret: secret}
          }} <-
           Multi.new()
           |> Multi.run(:existing_server_api_key, fn repo, _changes ->
             with {:ok, server_api_key_id} <- Ecto.UUID.cast(server_api_key_id),
                  %ServerApiKey{} = server_api_key <-
                    repo.one(
                      from server_api_key in ServerApiKey,
                        where:
                          server_api_key.app_environment_id == ^environment.id and
                            server_api_key.id == ^server_api_key_id and
                            is_nil(server_api_key.revoked_at),
                        lock: "FOR UPDATE"
                    ) do
               {:ok, server_api_key}
             else
               :error -> {:error, :not_found}
               nil -> {:error, :not_found}
             end
           end)
           |> Multi.run(:secret_material, fn _repo, _changes ->
             build_server_api_key_material(secret_generator)
           end)
           |> Multi.update(:revoked_server_api_key, fn %{
                                                         existing_server_api_key:
                                                           existing_server_api_key
                                                       } ->
             Ecto.Changeset.change(existing_server_api_key, revoked_at: now)
           end)
           |> Multi.insert(:replacement_server_api_key, fn %{
                                                             existing_server_api_key:
                                                               existing_server_api_key,
                                                             secret_material: secret_material
                                                           } ->
             ServerApiKey.changeset(%ServerApiKey{}, %{
               app_environment_id: environment.id,
               name: existing_server_api_key.name,
               secret_digest: secret_material.secret_digest,
               masked_hint: secret_material.masked_hint
             })
           end)
           |> Multi.insert(:audit_event, fn %{
                                              existing_server_api_key: existing_server_api_key,
                                              replacement_server_api_key:
                                                replacement_server_api_key
                                            } ->
             audit_event_changeset(
               actor_membership,
               environment,
               "server_api_key_rotated",
               existing_server_api_key.id,
               %{
                 "app_environment_id" => environment.id,
                 "name" => existing_server_api_key.name,
                 "replacement_server_api_key_id" => replacement_server_api_key.id
               }
             )
           end)
           |> Repo.transaction() do
      {:ok,
       %{server_api_key: serialize_server_api_key(replacement_server_api_key), secret: secret}}
    else
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, :not_found} -> {:error, :not_found}
      :error -> {:error, :not_found}
      nil -> {:error, :not_found}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end

  def rotate_server_api_key(_, _, _, _, _), do: {:error, :forbidden}

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

  defp resolve_environment_for_membership(
         %Membership{workspace_id: workspace_id, status: "active"},
         notification_app_id,
         environment_id
       ) do
    case get_environment_by_ids(%Workspace{id: workspace_id}, notification_app_id, environment_id) do
      %Environment{} = environment -> {:ok, environment}
      nil -> {:error, :not_found}
    end
  end

  defp resolve_environment_for_membership(%Membership{}, _notification_app_id, _environment_id),
    do: {:error, :forbidden}

  defp build_server_api_key_material(secret_generator) do
    secret = secret_generator.()

    if ServerApiKey.valid_secret?(secret) do
      {:ok,
       %{
         secret: secret,
         secret_digest: ServerApiKey.digest_secret(secret),
         masked_hint: ServerApiKey.masked_hint(secret)
       }}
    else
      {:error, :invalid_secret}
    end
  end

  defp audit_event_changeset(
         %Membership{id: actor_membership_id, workspace_id: workspace_id},
         %Environment{id: environment_id},
         action,
         server_api_key_id,
         metadata
       ) do
    AuditEvent.changeset(%AuditEvent{}, %{
      workspace_id: workspace_id,
      actor_workspace_membership_id: actor_membership_id,
      action: action,
      target_type: "environment_server_api_key",
      target_id: server_api_key_id,
      metadata: Map.put(metadata, "environment_id", environment_id)
    })
  end

  defp serialize_server_api_key(server_api_key) do
    %{
      id: server_api_key.id,
      app_environment_id: server_api_key.app_environment_id,
      name: server_api_key.name,
      masked_hint: server_api_key.masked_hint,
      revoked_at: server_api_key.revoked_at,
      inserted_at: server_api_key.inserted_at,
      updated_at: server_api_key.updated_at
    }
  end

  defp notification_app_readiness_preloads do
    active_client_keys =
      from client_key in ClientKey,
        where: is_nil(client_key.revoked_at)

    [environments: [{:client_keys, active_client_keys}, :trusted_origins]]
  end
end
