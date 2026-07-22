defmodule Domain.TrustedOrigin do
  @moduledoc """
  Pure normalization and validation for exact browser origins.
  """

  @schemes ["http", "https"]

  @doc """
  Normalizes an exact HTTP(S) origin or returns a stable validation error.
  """
  @spec normalize(term()) :: {:ok, String.t()} | {:error, :invalid_origin}
  def normalize(origin) when is_binary(origin) do
    with true <- origin == String.trim(origin),
         %URI{} = uri <- URI.parse(origin),
         scheme when scheme in @schemes <- normalize_scheme(uri.scheme),
         true <- is_binary(uri.host) and uri.host != "",
         true <- valid_authority?(uri.authority),
         true <- is_nil(uri.userinfo),
         true <- uri.path in [nil, ""],
         true <- is_nil(uri.query),
         true <- is_nil(uri.fragment),
         true <- valid_port?(uri.port),
         true <- not String.contains?(uri.host, "*") do
      {:ok, build_origin(scheme, uri.host, uri.port)}
    else
      _invalid -> {:error, :invalid_origin}
    end
  end

  def normalize(_origin), do: {:error, :invalid_origin}

  defp valid_port?(nil), do: true
  defp valid_port?(port), do: is_integer(port) and port in 1..65_535

  defp normalize_scheme(scheme) when is_binary(scheme), do: String.downcase(scheme)
  defp normalize_scheme(_scheme), do: nil

  defp valid_authority?(authority) when is_binary(authority) do
    Regex.match?(~r/^(?:[^:\[\]\s]+|\[[0-9A-Fa-f:.]+\])(?::[0-9]+)?$/, authority)
  end

  defp valid_authority?(_authority), do: false

  defp build_origin(scheme, host, port) do
    scheme = String.downcase(scheme)
    host = host |> String.downcase() |> format_host()
    port = normalize_port(scheme, port)

    if port, do: "#{scheme}://#{host}:#{port}", else: "#{scheme}://#{host}"
  end

  defp format_host(host) do
    if String.contains?(host, ":"), do: "[#{host}]", else: host
  end

  defp normalize_port("http", 80), do: nil
  defp normalize_port("https", 443), do: nil
  defp normalize_port(_scheme, port), do: port
end
