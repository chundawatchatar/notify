defmodule NotifyOpenApi.MixProject do
  use Mix.Project

  def project do
    [
      app: :notify_open_api,
      version: "0.1.0",
      elixir: "~> 1.20",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:jason, "~> 1.2"},
      {:open_api_spex, "~> 3.22"}
    ]
  end
end
