defmodule Api.NotificationIngress do
  @moduledoc """
  Transactional persistence for accepted notification ingress events.

  HTTP authentication and request canonicalization happen at the API boundary.
  This context receives the already validated source scope and digests, then
  atomically writes the event, idempotency record, and future outbox handoff.
  """

  import Ecto.Query

  alias Api.NotificationApps.{Environment, ServerApiKey}
  alias Api.NotificationIngress.{EventOutbox, IdempotencyKey, NotificationEvent}
  alias Api.Repo
  alias Ecto.Multi

  @fingerprint_version "ingress-body-v1"
  @idempotency_retention_seconds 24 * 60 * 60

  @type source :: %{
          required(:workspace_id) => Ecto.UUID.t(),
          required(:notification_app_id) => Ecto.UUID.t(),
          required(:app_environment_id) => Ecto.UUID.t(),
          required(:source_kind) => String.t(),
          optional(:source_server_api_key_id) => Ecto.UUID.t() | nil
        }

  @type accepted_result :: %{
          event: NotificationEvent.t(),
          idempotency_key: IdempotencyKey.t(),
          outbox: EventOutbox.t(),
          duplicate: boolean()
        }

  @doc """
  Persists one accepted event and its future handoff atomically.

  The caller supplies SHA-256 digests for the opaque idempotency key and the
  canonical validated request body. A matching active record returns the
  original result; a mismatched replay returns `:idempotency_key_conflict`.
  """
  @spec accept_event(source(), map(), DateTime.t()) ::
          {:ok, accepted_result()} | {:error, term()}
  def accept_event(source, attrs, now \\ DateTime.utc_now(:second))

  def accept_event(source, attrs, %DateTime{} = now) when is_map(source) and is_map(attrs) do
    with :ok <- validate_source(source),
         :ok <- validate_source_association(source),
         {:ok, attrs} <- normalize_attrs(attrs, now) do
      persist_or_replay(source, attrs, now)
    end
  end

  def accept_event(_source, _attrs, _now), do: {:error, :invalid_request}

  @doc "Returns recent accepted events scoped to one workspace and environment."
  @spec list_recent_events(Ecto.UUID.t(), Ecto.UUID.t(), non_neg_integer()) ::
          [NotificationEvent.t()]
  def list_recent_events(workspace_id, app_environment_id, limit \\ 50)
      when is_binary(workspace_id) and is_binary(app_environment_id) and is_integer(limit) do
    Repo.all(
      from event in NotificationEvent,
        join: outbox in EventOutbox,
        on: outbox.notification_event_id == event.id,
        where:
          event.workspace_id == ^workspace_id and
            event.app_environment_id == ^app_environment_id,
        order_by: [desc: event.accepted_at, desc: event.id],
        limit: ^max(limit, 0),
        select_merge: %{delivery_status: outbox.status}
    )
  end

  defp persist_or_replay(source, attrs, now) do
    case Repo.transaction(build_persistence_multi(source, attrs, now)) do
      {:ok, changes} ->
        {:ok,
         %{
           event: changes.event,
           idempotency_key: changes.idempotency_key,
           outbox: changes.outbox,
           duplicate: false
         }}

      {:error, :existing_idempotency_key, _reason, _changes} ->
        resolve_existing(source, attrs, now)

      {:error, :idempotency_key, changeset, _changes} ->
        if unique_constraint_error?(changeset),
          do: resolve_existing(source, attrs, now),
          else: {:error, changeset}

      {:error, _operation, reason, _changes} ->
        {:error, reason}
    end
  end

  defp build_persistence_multi(source, attrs, now) do
    Multi.new()
    |> Multi.run(:existing_idempotency_key, fn repo, _changes ->
      query =
        from key in IdempotencyKey,
          where:
            key.app_environment_id == ^source.app_environment_id and
              key.idempotency_key_digest == ^attrs.idempotency_key_digest,
          lock: "FOR UPDATE"

      case repo.one(query) do
        nil -> {:ok, nil}
        existing -> handle_existing(repo, existing, now)
      end
    end)
    |> Multi.insert(:event, fn _changes ->
      NotificationEvent.changeset(%NotificationEvent{}, %{
        workspace_id: source.workspace_id,
        notification_app_id: source.notification_app_id,
        app_environment_id: source.app_environment_id,
        source_server_api_key_id: source[:source_server_api_key_id],
        source_kind: source.source_kind,
        event_name: attrs.event_name,
        recipient_id: attrs.recipient_id,
        payload: attrs.payload,
        metadata: attrs.metadata,
        occurred_at: attrs.occurred_at,
        accepted_at: now,
        payload_size: attrs.payload_size
      })
    end)
    |> Multi.insert(:idempotency_key, fn %{event: event} ->
      IdempotencyKey.changeset(%IdempotencyKey{}, %{
        app_environment_id: source.app_environment_id,
        idempotency_key_digest: attrs.idempotency_key_digest,
        request_fingerprint: attrs.request_fingerprint,
        fingerprint_version: attrs.fingerprint_version,
        notification_event_id: event.id,
        expires_at: attrs.expires_at
      })
    end)
    |> Multi.insert(:outbox, fn %{event: event} ->
      EventOutbox.changeset(%EventOutbox{}, %{
        notification_event_id: event.id,
        app_environment_id: source.app_environment_id,
        recipient_id: attrs.recipient_id,
        event_name: attrs.event_name,
        status: "pending",
        available_at: now
      })
    end)
  end

  defp handle_existing(repo, existing, now) do
    if DateTime.compare(existing.expires_at, now) != :gt do
      repo.delete(existing)
    else
      {:error, existing}
    end
  end

  defp resolve_existing(source, attrs, now) do
    existing =
      Repo.one(
        from key in IdempotencyKey,
          where:
            key.app_environment_id == ^source.app_environment_id and
              key.idempotency_key_digest == ^attrs.idempotency_key_digest and
              key.expires_at > ^now,
          preload: [:notification_event]
      )

    case existing do
      %IdempotencyKey{
        request_fingerprint: fingerprint,
        fingerprint_version: version,
        notification_event: event
      }
      when fingerprint == attrs.request_fingerprint and version == attrs.fingerprint_version ->
        outbox = Repo.get_by!(EventOutbox, notification_event_id: event.id)

        {:ok,
         %{
           event: event,
           idempotency_key: existing,
           outbox: outbox,
           duplicate: true
         }}

      %IdempotencyKey{} ->
        {:error, :idempotency_key_conflict}

      nil ->
        {:error, :idempotency_key_conflict}
    end
  end

  defp validate_source(source) do
    required_keys = [:workspace_id, :notification_app_id, :app_environment_id, :source_kind]

    if Enum.all?(required_keys, &Map.has_key?(source, &1)) and
         source.source_kind in ["public_api", "dashboard_test"] and
         valid_uuid_values?(source) do
      :ok
    else
      {:error, :invalid_source}
    end
  end

  defp validate_source_association(%{source_kind: "dashboard_test"} = source) do
    if is_nil(source[:source_server_api_key_id]),
      do: validate_environment_scope(source),
      else: {:error, :invalid_source}
  end

  defp validate_source_association(%{source_kind: "public_api"} = source) do
    with {:ok, source_server_api_key_id} <-
           Ecto.UUID.cast(source[:source_server_api_key_id] || ""),
         %ServerApiKey{} <-
           Repo.one(
             from key in ServerApiKey,
               join: environment in assoc(key, :environment),
               join: notification_app in assoc(environment, :notification_app),
               where:
                 key.id == ^source_server_api_key_id and
                   key.app_environment_id == ^source.app_environment_id and
                   environment.notification_app_id == ^source.notification_app_id and
                   notification_app.workspace_id == ^source.workspace_id and
                   is_nil(notification_app.archived_at) and
                   is_nil(key.revoked_at)
           ) do
      :ok
    else
      _ -> {:error, :invalid_source}
    end
  end

  defp validate_environment_scope(source) do
    if Repo.exists?(
         from environment in Environment,
           join: notification_app in assoc(environment, :notification_app),
           where:
             environment.id == ^source.app_environment_id and
               environment.notification_app_id == ^source.notification_app_id and
               notification_app.workspace_id == ^source.workspace_id and
               is_nil(notification_app.archived_at)
       ),
       do: :ok,
       else: {:error, :invalid_source}
  end

  defp normalize_attrs(attrs, now) do
    with {:ok, payload} <- fetch_required(attrs, :payload),
         {:ok, event_name} <- fetch_required(attrs, :event_name),
         {:ok, recipient_id} <- fetch_required(attrs, :recipient_id),
         {:ok, idempotency_key_digest} <- fetch_required(attrs, :idempotency_key_digest),
         {:ok, request_fingerprint} <- fetch_required(attrs, :request_fingerprint),
         {:ok, payload_size} <- payload_size(attrs, payload),
         :ok <- validate_digest(idempotency_key_digest),
         :ok <- validate_digest(request_fingerprint) do
      {:ok,
       %{
         event_name: event_name,
         recipient_id: recipient_id,
         payload: payload,
         metadata: fetch(attrs, :metadata, %{}),
         occurred_at: fetch(attrs, :occurred_at, now),
         payload_size: payload_size,
         idempotency_key_digest: idempotency_key_digest,
         request_fingerprint: request_fingerprint,
         fingerprint_version: fetch(attrs, :fingerprint_version, @fingerprint_version),
         expires_at:
           fetch(
             attrs,
             :expires_at,
             DateTime.add(now, @idempotency_retention_seconds, :second)
           )
       }}
    else
      {:error, _reason} = error -> error
    end
  end

  defp payload_size(attrs, payload) do
    case fetch(attrs, :payload_size) do
      nil ->
        case Jason.encode(payload) do
          {:ok, encoded} -> {:ok, byte_size(encoded)}
          {:error, _reason} -> {:error, :invalid_payload}
        end

      size when is_integer(size) and size >= 0 ->
        {:ok, size}

      _ ->
        {:error, :invalid_payload_size}
    end
  end

  defp fetch_required(attrs, key) do
    case fetch(attrs, key) do
      nil -> {:error, {:missing, key}}
      value -> {:ok, value}
    end
  end

  defp fetch(attrs, key, default \\ nil) do
    Map.get(attrs, key, Map.get(attrs, Atom.to_string(key), default))
  end

  defp validate_digest(value) when is_binary(value) and byte_size(value) == 32, do: :ok
  defp validate_digest(_value), do: {:error, :invalid_digest}

  defp valid_uuid_values?(source) do
    Enum.all?([:workspace_id, :notification_app_id, :app_environment_id], fn key ->
      match?({:ok, _}, Ecto.UUID.cast(source[key]))
    end) and
      (is_nil(source[:source_server_api_key_id]) or
         match?({:ok, _}, Ecto.UUID.cast(source[:source_server_api_key_id])))
  end

  defp unique_constraint_error?(%Ecto.Changeset{errors: errors}) do
    Enum.any?(errors, fn
      {:idempotency_key_digest, {_message, opts}} -> opts[:constraint] == :unique
      _ -> false
    end)
  end

  defp unique_constraint_error?(_changeset), do: false
end
