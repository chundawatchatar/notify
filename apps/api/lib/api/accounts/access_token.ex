defmodule Api.Accounts.AccessToken do
  use Joken.Config

  @access_token_validity_in_seconds 15 * 60
  @issuer "notify-api"
  @audience "notify-dashboard"

  add_hook(Joken.Hooks.RequiredClaims, [:exp, :iat, :nbf, :iss, :aud, :sub, :sid, :wid])

  @impl Joken.Config
  def token_config do
    default_claims(
      default_exp: @access_token_validity_in_seconds,
      iss: @issuer,
      aud: @audience,
      skip: [:jti]
    )
    |> add_claim("sub", nil, &is_binary/1)
    |> add_claim("sid", nil, &is_binary/1)
    |> add_claim("wid", nil, &is_binary/1)
  end

  def issue(user, workspace, session) do
    claims = %{
      "sub" => user.id,
      "sid" => session.id,
      "wid" => workspace.id
    }

    case generate_and_sign(claims, signer()) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  def verify_access(token) when is_binary(token) do
    verify_and_validate(token, signer())
  end

  def verify_access(_token), do: {:error, :token_malformed}

  def expires_in, do: @access_token_validity_in_seconds

  defp signer do
    secret = Application.fetch_env!(:api, :auth_jwt_secret)
    Joken.Signer.create("HS256", secret)
  end
end
