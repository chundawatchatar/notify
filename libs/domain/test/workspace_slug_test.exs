defmodule Domain.WorkspaceSlugTest do
  use ExUnit.Case, async: true

  alias Domain.WorkspaceSlug

  test "normalizes readable names into lowercase kebab-case slugs" do
    assert WorkspaceSlug.normalize("  Acmé Cloud, Inc.  ") == "acme-cloud-inc"
    assert WorkspaceSlug.normalize("***") == "workspace"
  end

  test "validates normalized slugs and preserves room for collision suffixes" do
    assert WorkspaceSlug.valid?("acme-cloud-2")
    refute WorkspaceSlug.valid?("Acme Cloud")
    refute WorkspaceSlug.valid?("-acme-cloud-")

    assert WorkspaceSlug.with_suffix(String.duplicate("a", 50), 2) ==
             String.duplicate("a", 48) <> "-2"
  end
end
