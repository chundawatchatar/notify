defmodule Domain.EnvironmentSetupReadiness do
  @moduledoc """
  Derives whether an app environment has its minimum browser-client setup.
  """

  @type requirement :: :client_key | :trusted_origin
  @type result :: %{ready: boolean(), missing_requirements: [requirement()]}

  @doc """
  Returns readiness from active client-key and trusted-origin counts.
  """
  @spec evaluate(non_neg_integer(), non_neg_integer()) :: result()
  def evaluate(active_client_key_count, trusted_origin_count)
      when is_integer(active_client_key_count) and active_client_key_count >= 0 and
             is_integer(trusted_origin_count) and trusted_origin_count >= 0 do
    missing_requirements =
      []
      |> missing_when(active_client_key_count == 0, :client_key)
      |> missing_when(trusted_origin_count == 0, :trusted_origin)

    %{ready: missing_requirements == [], missing_requirements: missing_requirements}
  end

  defp missing_when(requirements, true, requirement), do: requirements ++ [requirement]
  defp missing_when(requirements, false, _requirement), do: requirements
end
