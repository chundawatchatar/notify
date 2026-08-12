defmodule Domain.DeliveryAnalyticsTest do
  use ExUnit.Case, async: true

  alias Domain.DeliveryAnalytics

  test "resolves fixed half-open windows and ordered buckets" do
    as_of = ~U[2026-08-12 12:34:56Z]

    assert {:ok, window} = DeliveryAnalytics.window("24h", as_of)
    assert window.start_at == ~U[2026-08-11 12:34:56Z]
    assert window.as_of == as_of
    assert window.bucket_seconds == 3_600
    assert window.bucket_count == 24

    buckets = DeliveryAnalytics.buckets(window)

    assert length(buckets) == 24
    assert hd(buckets) == %{start_at: window.start_at, end_at: ~U[2026-08-11 13:34:56Z]}
    assert List.last(buckets).end_at == as_of
    assert {:error, :invalid_window} = DeliveryAnalytics.window("1h", as_of)
  end

  test "summarizes handoff counts and preserves a null empty publication rate" do
    assert DeliveryAnalytics.summarize_counts(2, 1, 3) == %{
             accepted: 6,
             pending: 2,
             processing: 1,
             published: 3,
             unpublished: 3,
             publication_rate: %{numerator: 3, denominator: 6, value: 0.5}
           }

    assert DeliveryAnalytics.summarize_counts(0, 0, 0).publication_rate == %{
             numerator: 0,
             denominator: 0,
             value: nil
           }
  end
end
