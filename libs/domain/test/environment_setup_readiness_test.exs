defmodule Domain.EnvironmentSetupReadinessTest do
  use ExUnit.Case, async: true

  alias Domain.EnvironmentSetupReadiness

  test "reports each missing setup requirement" do
    assert EnvironmentSetupReadiness.evaluate(0, 0) == %{
             ready: false,
             missing_requirements: [:client_key, :trusted_origin]
           }

    assert EnvironmentSetupReadiness.evaluate(1, 0) == %{
             ready: false,
             missing_requirements: [:trusted_origin]
           }

    assert EnvironmentSetupReadiness.evaluate(0, 1) == %{
             ready: false,
             missing_requirements: [:client_key]
           }
  end

  test "is ready when an active client key and trusted origin exist" do
    assert EnvironmentSetupReadiness.evaluate(1, 1) == %{ready: true, missing_requirements: []}
  end
end
