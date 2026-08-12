defmodule Domain.DeliveryAnalytics do
  @moduledoc """
  Defines the fixed delivery analytics windows and metric summaries.

  Persistence adapters own source queries and percentile calculation. This
  module owns the stable window boundaries and count relationships used by
  every analytics response.
  """

  @windows %{
    "24h" => %{duration_seconds: 24 * 60 * 60, bucket_seconds: 60 * 60},
    "7d" => %{duration_seconds: 7 * 24 * 60 * 60, bucket_seconds: 24 * 60 * 60},
    "30d" => %{duration_seconds: 30 * 24 * 60 * 60, bucket_seconds: 24 * 60 * 60}
  }

  @type window_name :: String.t()

  @type window :: %{
          name: window_name(),
          start_at: DateTime.t(),
          as_of: DateTime.t(),
          bucket_seconds: pos_integer(),
          bucket_count: pos_integer()
        }

  @type counts :: %{
          accepted: non_neg_integer(),
          pending: non_neg_integer(),
          processing: non_neg_integer(),
          published: non_neg_integer(),
          unpublished: non_neg_integer(),
          publication_rate: %{
            numerator: non_neg_integer(),
            denominator: non_neg_integer(),
            value: float() | nil
          }
        }

  @doc "Returns one supported half-open UTC window anchored at `as_of`."
  @spec window(String.t(), DateTime.t()) :: {:ok, window()} | {:error, :invalid_window}
  def window(name, %DateTime{} = as_of) do
    case Map.fetch(@windows, name) do
      {:ok, %{duration_seconds: duration_seconds, bucket_seconds: bucket_seconds}} ->
        as_of = as_of |> DateTime.to_unix(:second) |> DateTime.from_unix!(:second)

        {:ok,
         %{
           name: name,
           start_at: DateTime.add(as_of, -duration_seconds, :second),
           as_of: as_of,
           bucket_seconds: bucket_seconds,
           bucket_count: div(duration_seconds, bucket_seconds)
         }}

      :error ->
        {:error, :invalid_window}
    end
  end

  def window(_name, _as_of), do: {:error, :invalid_window}

  @doc "Returns ordered consecutive bucket boundaries for a resolved window."
  @spec buckets(window()) :: [%{start_at: DateTime.t(), end_at: DateTime.t()}]
  def buckets(%{
        start_at: %DateTime{} = start_at,
        bucket_seconds: bucket_seconds,
        bucket_count: bucket_count
      }) do
    Enum.map(0..(bucket_count - 1), fn index ->
      bucket_start = DateTime.add(start_at, index * bucket_seconds, :second)

      %{
        start_at: bucket_start,
        end_at: DateTime.add(bucket_start, bucket_seconds, :second)
      }
    end)
  end

  @doc "Builds accepted, unpublished, and exact publication-rate values from handoff states."
  @spec summarize_counts(non_neg_integer(), non_neg_integer(), non_neg_integer()) :: counts()
  def summarize_counts(pending, processing, published)
      when is_integer(pending) and pending >= 0 and is_integer(processing) and processing >= 0 and
             is_integer(published) and published >= 0 do
    accepted = pending + processing + published

    %{
      accepted: accepted,
      pending: pending,
      processing: processing,
      published: published,
      unpublished: pending + processing,
      publication_rate: %{
        numerator: published,
        denominator: accepted,
        value: if(accepted == 0, do: nil, else: published / accepted)
      }
    }
  end
end
