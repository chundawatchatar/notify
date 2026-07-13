defmodule Api.Accounts.AuthSession do
  use Ecto.Schema

  import Ecto.Changeset

  @rand_size 32

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "auth_sessions" do
    field :refresh_token_hash, :binary, redact: true
    field :expires_at, :utc_datetime
    field :revoked_at, :utc_datetime

    belongs_to :workspace_membership, Api.Workspaces.Membership

    timestamps(type: :utc_datetime)
  end

  def build(membership, remember, now \\ DateTime.utc_now(:second)) do
    id = Ecto.UUID.generate()
    secret = :crypto.strong_rand_bytes(@rand_size)
    validity_in_days = if remember, do: 30, else: 1

    session = %__MODULE__{
      id: id,
      workspace_membership_id: membership.id,
      refresh_token_hash: hash(secret),
      expires_at: DateTime.add(now, validity_in_days, :day)
    }

    {encode(id, secret), session}
  end

  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :id,
      :workspace_membership_id,
      :refresh_token_hash,
      :expires_at,
      :revoked_at
    ])
    |> validate_required([:id, :workspace_membership_id, :refresh_token_hash, :expires_at])
    |> foreign_key_constraint(:workspace_membership_id)
    |> unique_constraint(:refresh_token_hash)
  end

  def rotate_changeset(session, secret) do
    change(session, refresh_token_hash: hash(secret))
  end

  def revoke_changeset(session, now \\ DateTime.utc_now(:second)) do
    change(session, revoked_at: now)
  end

  def generate_rotated_token(%__MODULE__{id: id}) do
    secret = :crypto.strong_rand_bytes(@rand_size)
    {encode(id, secret), secret}
  end

  def decode(token) when is_binary(token) do
    with [id, encoded_secret] <- String.split(token, ".", parts: 2),
         {:ok, _binary_id} <- Ecto.UUID.dump(id),
         {:ok, secret} <- Base.url_decode64(encoded_secret, padding: false) do
      {:ok, id, secret}
    else
      _invalid -> :error
    end
  end

  def decode(_token), do: :error

  def secret_valid?(%__MODULE__{refresh_token_hash: expected}, secret)
      when is_binary(expected) and is_binary(secret) do
    provided = hash(secret)

    byte_size(provided) == byte_size(expected) and
      Plug.Crypto.secure_compare(provided, expected)
  end

  def active?(%__MODULE__{revoked_at: nil, expires_at: expires_at}, now) do
    DateTime.after?(expires_at, now)
  end

  def active?(_session, _now), do: false

  defp encode(id, secret), do: id <> "." <> Base.url_encode64(secret, padding: false)
  defp hash(value), do: :crypto.hash(:sha256, value)
end
