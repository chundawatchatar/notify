defmodule ApiWeb.Routes.DeliveryAnalyticsRoutes do
  @moduledoc false

  defmacro delivery_analytics_routes do
    quote do
      get "/analytics", DeliveryAnalyticsController, :index
    end
  end
end
