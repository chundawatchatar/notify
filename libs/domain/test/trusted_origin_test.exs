defmodule Domain.TrustedOriginTest do
  use ExUnit.Case, async: true

  alias Domain.TrustedOrigin

  test "normalizes an exact browser origin" do
    assert {:ok, "https://console.example.com"} =
             TrustedOrigin.normalize("HTTPS://Console.Example.com:443")

    assert {:ok, "http://localhost:3100"} = TrustedOrigin.normalize("http://localhost:3100")
    assert {:ok, "http://[::1]:3100"} = TrustedOrigin.normalize("http://[::1]:3100")
  end

  test "rejects paths, credentials, and wildcard origins" do
    for origin <- [
          "https://console.example.com/settings",
          "https://console.example.com?preview=true",
          "https://user:password@console.example.com",
          "https://console.example.com:not-a-port",
          "https://*.example.com",
          "ftp://console.example.com"
        ] do
      assert {:error, :invalid_origin} = TrustedOrigin.normalize(origin)
    end
  end
end
