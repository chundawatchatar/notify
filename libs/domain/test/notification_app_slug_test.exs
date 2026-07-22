defmodule Domain.NotificationAppSlugTest do
  use ExUnit.Case, async: true

  alias Domain.NotificationAppSlug

  test "normalizes readable names into lowercase kebab-case slugs" do
    assert NotificationAppSlug.normalize("  Acmé Alerts, Inc.  ") == "acme-alerts-inc"
    assert NotificationAppSlug.normalize("***") == "app"
  end

  test "validates normalized slugs and preserves room for collision suffixes" do
    assert NotificationAppSlug.valid?("acme-alerts-2")
    refute NotificationAppSlug.valid?("Acme Alerts")
    refute NotificationAppSlug.valid?("-acme-alerts-")

    assert NotificationAppSlug.with_suffix(String.duplicate("a", 50), 2) ==
             String.duplicate("a", 48) <> "-2"
  end
end
