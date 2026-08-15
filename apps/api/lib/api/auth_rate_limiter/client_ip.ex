defmodule Api.AuthRateLimiter.ClientIp do
  @moduledoc false

  import Plug.Conn, only: [get_req_header: 2]

  def resolve(conn) do
    peer_ip = conn.remote_ip

    if trusted_proxy?(peer_ip) do
      forwarded_client(conn, peer_ip)
    else
      peer_ip
    end
  end

  defp forwarded_client(conn, peer_ip) do
    with [_ | _] = headers <- get_req_header(conn, "x-forwarded-for"),
         {:ok, forwarded_ips} <- parse_forwarded_ips(headers) do
      forwarded_ips
      |> Kernel.++([peer_ip])
      |> Enum.reverse()
      |> Enum.drop_while(&trusted_proxy?/1)
      |> List.first()
      |> then(&(&1 || peer_ip))
    else
      _missing_or_invalid -> peer_ip
    end
  end

  defp parse_forwarded_ips(headers) do
    headers
    |> Enum.flat_map(&String.split(&1, ","))
    |> Enum.map(&String.trim/1)
    |> Enum.reduce_while({:ok, []}, fn address, {:ok, parsed} ->
      case :inet.parse_strict_address(String.to_charlist(address)) do
        {:ok, ip} -> {:cont, {:ok, [ip | parsed]}}
        {:error, _reason} -> {:halt, :error}
      end
    end)
    |> case do
      {:ok, []} -> :error
      {:ok, parsed} -> {:ok, Enum.reverse(parsed)}
      :error -> :error
    end
  end

  defp trusted_proxy?(ip) do
    :api
    |> Application.fetch_env!(:auth_rate_limit_trusted_proxies)
    |> Enum.any?(fn range ->
      range
      |> InetCidr.parse_cidr!()
      |> InetCidr.contains?(ip)
    end)
  end
end
