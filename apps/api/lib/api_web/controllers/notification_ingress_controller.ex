defmodule ApiWeb.NotificationIngressController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Api.NotificationApps
  alias Api.NotificationIngress
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission
  alias NotifyOpenApi.AuthSchemas.ErrorResponse
  alias NotifyOpenApi.NotificationAppSchemas

  @fingerprint_version "ingress-body-v1"
  @max_payload_bytes 64_000
  @max_metadata_entries 20

  plug RequirePermission, :view_events when action in [:show, :events, :test_event]

  @dashboard_parameters [
    appId: [in: :path, schema: %OpenApiSpex.Schema{type: :string, format: :uuid}],
    environmentId: [in: :path, schema: %OpenApiSpex.Schema{type: :string, format: :uuid}]
  ]

  operation :create,
    summary: "Accept a notification event",
    operation_id: "createNotification",
    parameters: [
      authorization: [in: :header, required: true, schema: %OpenApiSpex.Schema{type: :string}],
      idempotency_key: [
        in: :header,
        required: true,
        schema: %OpenApiSpex.Schema{type: :string, minLength: 1, maxLength: 255}
      ]
    ],
    request_body:
      {"Notification event", "application/json", NotificationAppSchemas.NotificationRequest,
       required: true},
    responses: [
      accepted:
        {"Accepted notification", "application/json", NotificationAppSchemas.IngestResponse},
      ok: {"Duplicate notification", "application/json", NotificationAppSchemas.IngestResponse},
      bad_request: {"Invalid request", "application/json", ErrorResponse},
      unauthorized: {"Invalid server API key", "application/json", ErrorResponse},
      conflict: {"Idempotency conflict", "application/json", ErrorResponse},
      unsupported_media_type: {"Unsupported media type", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ErrorResponse}
    ]

  def create(conn, params) do
    with {:ok, secret} <- bearer_secret(conn),
         %{server_api_key: server_api_key} = source when is_map(source) <-
           NotificationApps.authenticate_server_api_key(secret),
         {:ok, idempotency_key} <- required_header(conn, "idempotency-key"),
         {:ok, attrs} <- validate_request(params),
         {:ok, fingerprint} <- canonical_fingerprint(params) do
      source = %{
        workspace_id: source.workspace_id,
        notification_app_id: source.notification_app_id,
        app_environment_id: source.app_environment_id,
        source_kind: "public_api",
        source_server_api_key_id: server_api_key.id
      }

      attrs =
        Map.merge(attrs, %{
          idempotency_key_digest: :crypto.hash(:sha256, idempotency_key),
          request_fingerprint: fingerprint,
          fingerprint_version: @fingerprint_version
        })

      case NotificationIngress.accept_event(source, attrs) do
        {:ok, result} ->
          conn
          |> put_status(if(result.duplicate, do: :ok, else: :accepted))
          |> json(%{data: ingest_payload(result)})

        {:error, :idempotency_key_conflict} ->
          AuthError.render(
            conn,
            :conflict,
            "idempotency_key_conflict",
            "The idempotency key was already used for a different request."
          )

        {:error, _reason} ->
          AuthError.render(
            conn,
            :unprocessable_entity,
            "invalid_request",
            "Request validation failed."
          )
      end
    else
      nil ->
        AuthError.render(conn, :unauthorized, "unauthorized", "Server API key is invalid.")

      {:error, :unauthorized} ->
        AuthError.render(conn, :unauthorized, "unauthorized", "Server API key is invalid.")

      {:error, :missing_header} ->
        AuthError.render(conn, :bad_request, "invalid_request", "Request validation failed.")

      {:error, {:validation, fields}} ->
        AuthError.render(
          conn,
          :unprocessable_entity,
          "invalid_request",
          "Request validation failed.",
          fields
        )

      {:error, :payload_too_large} ->
        AuthError.render(
          conn,
          413,
          "payload_too_large",
          "Payload exceeds the maximum allowed size."
        )
    end
  end

  operation :show,
    summary: "Get notification ingress details",
    operation_id: "getNotificationIngress",
    security: [%{"bearerAuth" => []}],
    parameters: @dashboard_parameters,
    responses: [
      ok: {"Ingress details", "application/json", NotificationAppSchemas.IngressDetailsResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse}
    ]

  def show(conn, %{"appId" => app_id, "environmentId" => environment_id}) do
    case NotificationApps.get_environment_by_ids(
           conn.assigns.current_workspace,
           app_id,
           environment_id
         ) do
      nil ->
        dashboard_not_found(conn)

      environment ->
        json(conn, %{
          data: %{
            app_id: app_id,
            environment_id: environment.id,
            endpoint: "/api/v1/notifications",
            idempotency_window_hours: 24,
            source: "server_api_key"
          }
        })
    end
  end

  operation :events,
    summary: "List recent accepted notification events",
    operation_id: "listNotificationIngressEvents",
    security: [%{"bearerAuth" => []}],
    parameters: @dashboard_parameters,
    responses: [
      ok:
        {"Recent accepted events", "application/json",
         NotificationAppSchemas.IngressEventsResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse}
    ]

  def events(conn, %{"appId" => app_id, "environmentId" => environment_id}) do
    with environment when not is_nil(environment) <-
           NotificationApps.get_environment_by_ids(
             conn.assigns.current_workspace,
             app_id,
             environment_id
           ) do
      events =
        NotificationIngress.list_recent_events(conn.assigns.current_workspace.id, environment.id)

      json(conn, %{events: Enum.map(events, &event_payload/1)})
    else
      _ -> dashboard_not_found(conn)
    end
  end

  operation :test_event,
    summary: "Accept a dashboard test event",
    operation_id: "createNotificationIngressTestEvent",
    security: [%{"bearerAuth" => []}],
    parameters: @dashboard_parameters,
    request_body:
      {"Test notification event", "application/json", NotificationAppSchemas.NotificationRequest,
       required: true},
    responses: [
      accepted:
        {"Accepted test event", "application/json", NotificationAppSchemas.IngestResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ErrorResponse}
    ]

  def test_event(conn, %{"appId" => app_id, "environmentId" => environment_id} = params) do
    body_params = Map.drop(params, ["appId", "environmentId"])

    with environment when not is_nil(environment) <-
           NotificationApps.get_environment_by_ids(
             conn.assigns.current_workspace,
             app_id,
             environment_id
           ),
         {:ok, attrs} <- validate_request(body_params),
         {:ok, fingerprint} <- canonical_fingerprint(body_params) do
      source = %{
        workspace_id: conn.assigns.current_workspace.id,
        notification_app_id: app_id,
        app_environment_id: environment.id,
        source_kind: "dashboard_test"
      }

      attrs =
        Map.merge(attrs, %{
          idempotency_key_digest: :crypto.strong_rand_bytes(32),
          request_fingerprint: fingerprint,
          fingerprint_version: @fingerprint_version
        })

      case NotificationIngress.accept_event(source, attrs) do
        {:ok, result} ->
          conn
          |> put_status(:accepted)
          |> json(%{data: ingest_payload(result)})

        {:error, _reason} ->
          AuthError.render(
            conn,
            :unprocessable_entity,
            "invalid_request",
            "Request validation failed."
          )
      end
    else
      nil ->
        dashboard_not_found(conn)

      {:error, {:validation, fields}} ->
        AuthError.render(
          conn,
          :unprocessable_entity,
          "invalid_request",
          "Request validation failed.",
          fields
        )

      {:error, :payload_too_large} ->
        AuthError.render(
          conn,
          413,
          "payload_too_large",
          "Payload exceeds the maximum allowed size."
        )
    end
  end

  defp bearer_secret(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> secret] when byte_size(secret) > 0 -> {:ok, secret}
      _ -> {:error, :unauthorized}
    end
  end

  defp required_header(conn, name) do
    case get_req_header(conn, name) do
      [value] when byte_size(value) in 1..255 -> {:ok, value}
      _ -> {:error, :missing_header}
    end
  end

  defp validate_request(params) do
    allowed = MapSet.new(["event", "recipient", "payload", "occurredAt", "metadata"])

    with :ok <- unknown_fields(params, allowed),
         :ok <- validate_safe_content(params),
         {:ok, event} <- required_string(params, "event", 120),
         :ok <- validate_event(event),
         {:ok, recipient} <- required_map(params, "recipient"),
         {:ok, recipient_id} <- required_string(recipient, "id", 255),
         {:ok, payload} <- required_map(params, "payload"),
         :ok <- validate_payload_size(payload),
         {:ok, metadata} <- optional_metadata(params),
         {:ok, occurred_at} <- optional_timestamp(params) do
      {:ok,
       %{
         event_name: event,
         recipient_id: recipient_id,
         payload: payload,
         metadata: metadata,
         occurred_at: occurred_at,
         payload_size: byte_size(Jason.encode!(payload))
       }}
    else
      {:error, :payload_too_large} -> {:error, :payload_too_large}
      {:error, field} -> {:error, {:validation, %{field => ["is invalid"]}}}
    end
  end

  defp unknown_fields(params, allowed) do
    if params |> Map.keys() |> Enum.all?(&MapSet.member?(allowed, &1)),
      do: :ok,
      else: {:error, "request"}
  end

  defp validate_safe_content(value) when is_map(value) do
    if Enum.all?(value, fn {key, item} ->
         safe_key?(key) and match?(:ok, validate_safe_content(item))
       end),
       do: :ok,
       else: {:error, "sensitive_content"}
  end

  defp validate_safe_content(value) when is_list(value) do
    if Enum.all?(value, &match?(:ok, validate_safe_content(&1))),
      do: :ok,
      else: {:error, "sensitive_content"}
  end

  defp validate_safe_content(_value), do: :ok

  defp safe_key?(key) when is_binary(key) do
    normalized = key |> String.normalize(:nfc) |> String.downcase()

    not (normalized in [
           "authorization",
           "api_key",
           "apikey",
           "cookie",
           "password",
           "secret",
           "token"
         ] or
           String.contains?(normalized, "bearer"))
  end

  defp safe_key?(_key), do: true

  defp required_string(map, key, max) do
    case Map.get(map, key) do
      value when is_binary(value) and byte_size(value) in 1..max//1 -> {:ok, value}
      _ -> {:error, key}
    end
  end

  defp required_map(map, key),
    do: if(is_map(Map.get(map, key)), do: {:ok, Map.get(map, key)}, else: {:error, key})

  defp validate_event(event),
    do:
      if(Regex.match?(~r/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/, event), do: :ok, else: {:error, "event"})

  defp validate_payload_size(payload) do
    if byte_size(Jason.encode!(payload)) <= @max_payload_bytes,
      do: :ok,
      else: {:error, :payload_too_large}
  end

  defp optional_metadata(%{"metadata" => metadata}) when is_map(metadata) do
    if map_size(metadata) <= @max_metadata_entries and
         Enum.all?(metadata, fn {_key, value} ->
           is_binary(value) or is_number(value) or is_boolean(value) or is_nil(value)
         end), do: {:ok, metadata}, else: {:error, "metadata"}
  end

  defp optional_metadata(_params), do: {:ok, %{}}

  defp optional_timestamp(%{"occurredAt" => value}) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, timestamp, 0} -> {:ok, timestamp}
      _ -> {:error, "occurredAt"}
    end
  end

  defp optional_timestamp(_params), do: {:ok, nil}

  defp canonical_fingerprint(params) do
    normalized = canonicalize(params)
    {:ok, :crypto.hash(:sha256, Jason.encode!(normalized))}
  rescue
    _ -> {:error, :invalid_request}
  end

  defp canonicalize(value) when is_map(value) do
    value
    |> Enum.map(fn {key, item} -> {key, canonicalize(item)} end)
    |> Enum.sort_by(&elem(&1, 0))
    |> Map.new()
  end

  defp canonicalize(value) when is_list(value), do: Enum.map(value, &canonicalize/1)
  defp canonicalize(value), do: value

  defp ingest_payload(result),
    do: %{
      event_id: result.event.id,
      duplicate: result.duplicate,
      accepted_at: result.event.accepted_at
    }

  defp event_payload(event) do
    %{
      event_id: event.id,
      event: event.event_name,
      recipient_id: event.recipient_id,
      source: event.source_kind,
      accepted_at: event.accepted_at,
      occurred_at: event.occurred_at
    }
  end

  defp dashboard_not_found(conn),
    do: AuthError.render(conn, :not_found, "environment_not_found", "Environment is unavailable.")
end
