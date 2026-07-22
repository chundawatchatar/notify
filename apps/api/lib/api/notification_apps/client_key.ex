defmodule Api.NotificationApps.ClientKey do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @key_prefix "nfy_pk_"

  schema "environment_client_keys" do
    field :key, :string
    field :revoked_at, :utc_datetime

    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    timestamps(type: :utc_datetime)
  end

  @doc """
  Builds a client identifier with 192 bits of server-generated entropy.
  """
  @spec generate() :: String.t()
  def generate do
    @key_prefix <> (:crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false))
  end

  @doc """
  Validates an environment-scoped client key before persistence.
  """
  def changeset(client_key, attrs) do
    client_key
    |> cast(attrs, [:app_environment_id, :key, :revoked_at])
    |> validate_required([:app_environment_id, :key])
    |> validate_format(:key, ~r/^nfy_pk_[A-Za-z0-9_-]{32}$/)
    |> foreign_key_constraint(:app_environment_id)
    |> unique_constraint(:key, name: :environment_client_keys_environment_id_key_index)
    |> check_constraint(:key, name: :environment_client_keys_key_format)
  end
end
