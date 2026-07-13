defmodule Api.Accounts.SignupChallenge do
  use Ecto.Schema

  import Ecto.Changeset

  alias Api.Accounts.User

  @verification_validity_in_hours 24
  @completion_validity_in_minutes 15
  @rand_size 32

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "signup_challenges" do
    field :email, :string
    field :verification_token_hash, :binary, redact: true
    field :verification_expires_at, :utc_datetime
    field :verified_at, :utc_datetime
    field :completion_token_hash, :binary, redact: true
    field :completion_expires_at, :utc_datetime
    field :consumed_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def build(email, now \\ DateTime.utc_now(:second)) do
    secret = :crypto.strong_rand_bytes(@rand_size)

    challenge = %__MODULE__{
      email: User.normalize_email(email),
      verification_token_hash: hash(secret),
      verification_expires_at: DateTime.add(now, @verification_validity_in_hours, :hour)
    }

    {encode(secret), challenge}
  end

  def changeset(challenge, attrs \\ %{}) do
    challenge
    |> cast(attrs, [:email, :verification_token_hash, :verification_expires_at])
    |> update_change(:email, &User.normalize_email/1)
    |> validate_required([:email, :verification_token_hash, :verification_expires_at])
    |> validate_format(:email, ~r/^[^@,;\s]+@[^@,;\s]+$/,
      message: "must have the @ sign and no spaces"
    )
    |> validate_length(:email, max: 160)
    |> unique_constraint(:email)
    |> unique_constraint(:verification_token_hash)
    |> check_constraint(:email, name: :signup_challenges_email_normalized)
    |> check_constraint(:email, name: :signup_challenges_email_length)
    |> check_constraint(:email, name: :signup_challenges_state)
  end

  def verify_changeset(challenge, now \\ DateTime.utc_now(:second)) do
    secret = :crypto.strong_rand_bytes(@rand_size)

    changeset =
      challenge
      |> change(
        verification_token_hash: nil,
        verification_expires_at: nil,
        verified_at: now,
        completion_token_hash: hash(secret),
        completion_expires_at: DateTime.add(now, @completion_validity_in_minutes, :minute)
      )
      |> unique_constraint(:completion_token_hash)
      |> check_constraint(:completion_token_hash, name: :signup_challenges_state)

    {encode(secret), changeset}
  end

  def consume_changeset(challenge, now \\ DateTime.utc_now(:second)) do
    challenge
    |> change(
      completion_token_hash: nil,
      completion_expires_at: nil,
      consumed_at: now
    )
    |> check_constraint(:completion_token_hash, name: :signup_challenges_state)
  end

  def token_hash(encoded_token) when is_binary(encoded_token) do
    with {:ok, secret} <- Base.url_decode64(encoded_token, padding: false),
         true <- byte_size(secret) == @rand_size do
      {:ok, hash(secret)}
    else
      _invalid -> :error
    end
  end

  def token_hash(_token), do: :error

  def completion_expires_in, do: @completion_validity_in_minutes * 60

  defp encode(secret), do: Base.url_encode64(secret, padding: false)
  defp hash(value), do: :crypto.hash(:sha256, value)
end
