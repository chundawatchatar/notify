defmodule ApiWeb.Routes.NotificationAppRoutes do
  @moduledoc false

  defmacro notification_app_routes do
    quote do
      get "/apps", NotificationAppController, :index
      post "/apps", NotificationAppController, :create
      get "/apps/:appSlug", NotificationAppController, :show
      patch "/apps/:appSlug", NotificationAppController, :update
      delete "/apps/:appSlug", NotificationAppController, :delete
    end
  end

  defmacro environment_configuration_routes do
    quote do
      get "/apps/:appSlug/environments/:environmentSlug/client-keys",
          EnvironmentConfigurationController,
          :list_client_keys

      post "/apps/:appSlug/environments/:environmentSlug/client-keys",
           EnvironmentConfigurationController,
           :create_client_key

      delete "/apps/:appSlug/environments/:environmentSlug/client-keys/:clientKeyId",
             EnvironmentConfigurationController,
             :revoke_client_key

      get "/apps/:appId/environments/:environmentId/server-api-keys",
          EnvironmentConfigurationController,
          :list_server_api_keys

      post "/apps/:appId/environments/:environmentId/server-api-keys",
           EnvironmentConfigurationController,
           :create_server_api_key

      post "/apps/:appId/environments/:environmentId/server-api-keys/:keyId/rotate",
           EnvironmentConfigurationController,
           :rotate_server_api_key

      delete "/apps/:appId/environments/:environmentId/server-api-keys/:keyId",
             EnvironmentConfigurationController,
             :revoke_server_api_key

      get "/apps/:appSlug/environments/:environmentSlug/trusted-origins",
          EnvironmentConfigurationController,
          :list_trusted_origins

      post "/apps/:appSlug/environments/:environmentSlug/trusted-origins",
           EnvironmentConfigurationController,
           :create_trusted_origin

      delete "/apps/:appSlug/environments/:environmentSlug/trusted-origins/:trustedOriginId",
             EnvironmentConfigurationController,
             :remove_trusted_origin
    end
  end

  defmacro notification_ingress_routes do
    quote do
      post "/v1/notifications", NotificationIngressController, :create
    end
  end

  defmacro notification_dashboard_ingress_routes do
    quote do
      get "/apps/:appId/environments/:environmentId/ingress",
          NotificationIngressController,
          :show

      get "/apps/:appId/environments/:environmentId/ingress/events",
          NotificationIngressController,
          :events

      post "/apps/:appId/environments/:environmentId/ingress/test-events",
           NotificationIngressController,
           :test_event
    end
  end
end
