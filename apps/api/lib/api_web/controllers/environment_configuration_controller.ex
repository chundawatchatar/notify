defmodule ApiWeb.EnvironmentConfigurationController do
  use ApiWeb, :controller
  use OpenApiSpex.ControllerSpecs

  require Logger

  alias Api.NotificationApps
  alias ApiWeb.AuthError
  alias ApiWeb.Plugs.RequirePermission
  alias NotifyOpenApi.AuthSchemas.{ErrorResponse, ValidationErrorResponse}

  alias NotifyOpenApi.NotificationAppSchemas.{
    ClientKey,
    ClientKeysResponse,
    CreateTrustedOriginRequest,
    TrustedOrigin,
    TrustedOriginsResponse
  }

  @environment_parameters [
    appSlug: [
      in: :path,
      description: "Notification app slug",
      schema: %OpenApiSpex.Schema{type: :string, minLength: 1, maxLength: 50}
    ],
    environmentSlug: [
      in: :path,
      description: "Environment slug",
      schema: %OpenApiSpex.Schema{type: :string, minLength: 1, maxLength: 50}
    ]
  ]

  @client_key_parameters @environment_parameters ++
                           [
                             clientKeyId: [
                               in: :path,
                               description: "Client key ID",
                               schema: %OpenApiSpex.Schema{type: :string, format: :uuid}
                             ]
                           ]

  @trusted_origin_parameters @environment_parameters ++
                               [
                                 trustedOriginId: [
                                   in: :path,
                                   description: "Trusted origin ID",
                                   schema: %OpenApiSpex.Schema{type: :string, format: :uuid}
                                 ]
                               ]

  plug RequirePermission, :view_apps when action in [:list_client_keys, :list_trusted_origins]

  plug RequirePermission,
       :manage_credentials
       when action in [
              :create_client_key,
              :revoke_client_key,
              :create_trusted_origin,
              :remove_trusted_origin
            ]

  tags ["environment configuration"]

  operation :list_client_keys,
    summary: "List client keys for an environment",
    operation_id: "listEnvironmentClientKeys",
    security: [%{"bearerAuth" => []}],
    parameters: @environment_parameters,
    responses: [
      ok: {"Environment client keys", "application/json", ClientKeysResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def list_client_keys(conn, params) do
    with {:ok, environment} <- scoped_environment(conn, params) do
      client_keys =
        environment |> NotificationApps.list_client_keys() |> Enum.map(&client_key_payload/1)

      json(conn, %{client_keys: client_keys})
    else
      :error -> environment_not_found(conn)
    end
  end

  operation :create_client_key,
    summary: "Create a client key for an environment",
    operation_id: "createEnvironmentClientKey",
    security: [%{"bearerAuth" => []}],
    parameters: @environment_parameters,
    responses: [
      created: {"Created environment client key", "application/json", ClientKey},
      not_found: {"Environment unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def create_client_key(conn, params) do
    with {:ok, environment} <- scoped_environment(conn, params),
         {:ok, client_key} <- NotificationApps.create_client_key(environment) do
      conn
      |> put_status(:created)
      |> json(client_key_payload(client_key))
    else
      :error -> environment_not_found(conn)
      {:error, reason} -> configuration_failed(conn, "Client key creation", reason)
    end
  end

  operation :revoke_client_key,
    summary: "Revoke an environment client key",
    operation_id: "revokeEnvironmentClientKey",
    security: [%{"bearerAuth" => []}],
    parameters: @client_key_parameters,
    responses: [
      no_content: "Client key revoked",
      not_found: {"Environment or client key unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def revoke_client_key(conn, %{"clientKeyId" => client_key_id} = params) do
    with {:ok, environment} <- scoped_environment(conn, params),
         {:ok, _client_key} <- NotificationApps.revoke_client_key(environment, client_key_id) do
      send_resp(conn, :no_content, "")
    else
      :error -> environment_not_found(conn)
      :not_found -> client_key_not_found(conn)
      {:error, reason} -> configuration_failed(conn, "Client key revocation", reason)
    end
  end

  operation :list_trusted_origins,
    summary: "List trusted origins for an environment",
    operation_id: "listEnvironmentTrustedOrigins",
    security: [%{"bearerAuth" => []}],
    parameters: @environment_parameters,
    responses: [
      ok: {"Environment trusted origins", "application/json", TrustedOriginsResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def list_trusted_origins(conn, params) do
    with {:ok, environment} <- scoped_environment(conn, params) do
      trusted_origins =
        environment
        |> NotificationApps.list_trusted_origins()
        |> Enum.map(&trusted_origin_payload/1)

      json(conn, %{trusted_origins: trusted_origins})
    else
      :error -> environment_not_found(conn)
    end
  end

  operation :create_trusted_origin,
    summary: "Add a trusted origin to an environment",
    operation_id: "createEnvironmentTrustedOrigin",
    security: [%{"bearerAuth" => []}],
    parameters: @environment_parameters,
    request_body:
      {"Trusted origin", "application/json", CreateTrustedOriginRequest, required: true},
    responses: [
      created: {"Created trusted origin", "application/json", TrustedOrigin},
      conflict: {"Trusted origin already exists", "application/json", ErrorResponse},
      not_found: {"Environment unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation failed", "application/json", ValidationErrorResponse}
    ]

  def create_trusted_origin(conn, params) do
    with {:ok, environment} <- scoped_environment(conn, params) do
      case NotificationApps.create_trusted_origin(environment, params) do
        {:ok, trusted_origin} ->
          conn
          |> put_status(:created)
          |> json(trusted_origin_payload(trusted_origin))

        {:error, %Ecto.Changeset{} = changeset} ->
          if trusted_origin_conflict?(changeset) do
            AuthError.render(
              conn,
              :conflict,
              "trusted_origin_exists",
              "This origin is already trusted for the environment."
            )
          else
            AuthError.validation(conn, changeset)
          end

        {:error, reason} ->
          configuration_failed(conn, "Trusted origin creation", reason)
      end
    else
      :error -> environment_not_found(conn)
    end
  end

  operation :remove_trusted_origin,
    summary: "Remove a trusted origin from an environment",
    operation_id: "removeEnvironmentTrustedOrigin",
    security: [%{"bearerAuth" => []}],
    parameters: @trusted_origin_parameters,
    responses: [
      no_content: "Trusted origin removed",
      not_found: {"Environment or trusted origin unavailable", "application/json", ErrorResponse},
      unauthorized: {"Access token invalid", "application/json", ErrorResponse},
      forbidden: {"Permission denied", "application/json", ErrorResponse}
    ]

  def remove_trusted_origin(conn, %{"trustedOriginId" => trusted_origin_id} = params) do
    with {:ok, environment} <- scoped_environment(conn, params),
         {:ok, _trusted_origin} <-
           NotificationApps.remove_trusted_origin(environment, trusted_origin_id) do
      send_resp(conn, :no_content, "")
    else
      :error -> environment_not_found(conn)
      :not_found -> trusted_origin_not_found(conn)
      {:error, reason} -> configuration_failed(conn, "Trusted origin removal", reason)
    end
  end

  defp scoped_environment(conn, %{"appSlug" => app_slug, "environmentSlug" => environment_slug}) do
    case NotificationApps.get_environment_by_slugs(
           conn.assigns.current_workspace,
           app_slug,
           environment_slug
         ) do
      nil -> :error
      environment -> {:ok, environment}
    end
  end

  defp scoped_environment(_conn, _params), do: :error

  defp client_key_payload(client_key) do
    %{
      id: client_key.id,
      key: client_key.key,
      created_at: client_key.inserted_at,
      revoked_at: client_key.revoked_at
    }
  end

  defp trusted_origin_payload(trusted_origin) do
    %{
      id: trusted_origin.id,
      origin: trusted_origin.origin,
      created_at: trusted_origin.inserted_at
    }
  end

  defp trusted_origin_conflict?(changeset) do
    Enum.any?(changeset.errors, fn
      {:origin, {_message, options}} -> options[:constraint] == :unique
      _error -> false
    end)
  end

  defp environment_not_found(conn) do
    AuthError.render(conn, :not_found, "environment_not_found", "Environment is unavailable.")
  end

  defp client_key_not_found(conn) do
    AuthError.render(conn, :not_found, "client_key_not_found", "Client key is unavailable.")
  end

  defp trusted_origin_not_found(conn) do
    AuthError.render(
      conn,
      :not_found,
      "trusted_origin_not_found",
      "Trusted origin is unavailable."
    )
  end

  defp configuration_failed(conn, operation, reason) do
    Logger.error("#{operation} failed: #{inspect(sanitize_reason(reason))}")

    AuthError.render(
      conn,
      :internal_server_error,
      "environment_configuration_failed",
      "Environment configuration is temporarily unavailable."
    )
  end

  defp sanitize_reason(%Ecto.Changeset{} = changeset), do: changeset.errors
  defp sanitize_reason(reason), do: reason
end
