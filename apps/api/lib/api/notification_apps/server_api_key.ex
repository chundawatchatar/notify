defmodule Api.NotificationApps.ServerApiKey do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @key_prefix "nfy_sk_"
  @masked_hint_prefix "..."
  @masked_hint_suffix_length 4

  schema "environment_server_api_keys" do
    field :name, :string
    field :secret_digest, :binary
    field :masked_hint, :string
    field :revoked_at, :utc_datetime

    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    timestamps(type: :utc_datetime)
  end

  @doc """
  Builds a server API key with 256 bits of server-generated entropy.
  """
  @spec generate() :: String.t()
  def generate do
    @key_prefix <> (:crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false))
  end

  @spec valid_secret?(term()) :: boolean()
  def valid_secret?(secret) when is_binary(secret) do
    String.match?(secret, ~r/^nfy_sk_[A-Za-z0-9_-]{43}$/)
  end

  def valid_secret?(_secret), do: false

  @spec digest_secret(String.t()) :: binary()
  def digest_secret(secret), do: :crypto.hash(:sha256, secret)

  @spec masked_hint(String.t()) :: String.t()
  def masked_hint(secret) do
    @masked_hint_prefix <>
      String.slice(secret, -@masked_hint_suffix_length, @masked_hint_suffix_length)
  end

  @doc """
  Validates an environment-scoped server API key before persistence.
  """
  def changeset(server_api_key, attrs) do
    server_api_key
    |> cast(attrs, [:app_environment_id, :name, :secret_digest, :masked_hint, :revoked_at])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:app_environment_id, :name, :secret_digest, :masked_hint])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_length(:masked_hint,
      is: String.length(@masked_hint_prefix) + @masked_hint_suffix_length
    )
    |> validate_change(:secret_digest, fn :secret_digest, secret_digest ->
      if byte_size(secret_digest) == 32, do: [], else: [secret_digest: "must be 32 bytes"]
    end)
    |> foreign_key_constraint(:app_environment_id)
    |> unique_constraint(:secret_digest, name: :environment_server_api_keys_secret_digest_index)
    |> check_constraint(:name, name: :environment_server_api_keys_name_length)
    |> check_constraint(:secret_digest, name: :environment_server_api_keys_secret_digest_length)
    |> check_constraint(:masked_hint, name: :environment_server_api_keys_masked_hint_format)
  end
end
