defmodule Api.Accounts.AuthChallenge do
  use Ecto.Schema

  import Ecto.Changeset

  alias Api.Accounts.User

  @signup_verification "signup_verification"
  @signup_completion "signup_completion"
  @password_reset_verification "password_reset_verification"
  @password_reset_completion "password_reset_completion"
  @purposes [
    @signup_verification,
    @signup_completion,
    @password_reset_verification,
    @password_reset_completion
  ]

  @signup_verification_validity_in_hours 24
  @password_reset_verification_validity_in_hours 1
  @completion_validity_in_minutes 15
  @rand_size 32

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "auth_challenges" do
    field :purpose, :string
    field :email, :string
    field :token_hash, :binary, redact: true
    field :expires_at, :utc_datetime
    field :verified_at, :utc_datetime
    field :consumed_at, :utc_datetime

    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  def build_signup_verification(email, now \\ DateTime.utc_now(:second)) do
    build(
      @signup_verification,
      %{email: User.normalize_email(email)},
      now,
      @signup_verification_validity_in_hours * 60 * 60
    )
  end

  def build_password_reset_verification(%User{} = user, now \\ DateTime.utc_now(:second)) do
    build(
      @password_reset_verification,
      %{user_id: user.id},
      now,
      @password_reset_verification_validity_in_hours * 60 * 60
    )
  end

  def build_completion(%__MODULE__{} = verification, purpose, now)
      when purpose in [@signup_completion, @password_reset_completion] do
    secret = :crypto.strong_rand_bytes(@rand_size)

    challenge = %__MODULE__{
      purpose: purpose,
      email: verification.email,
      user_id: verification.user_id,
      token_hash: hash(secret),
      expires_at: DateTime.add(now, @completion_validity_in_minutes, :minute),
      verified_at: now
    }

    {encode(secret), challenge}
  end

  def changeset(challenge, attrs \\ %{}) do
    challenge
    |> cast(attrs, [
      :purpose,
      :email,
      :user_id,
      :token_hash,
      :expires_at,
      :verified_at,
      :consumed_at
    ])
    |> update_change(:email, &User.normalize_email/1)
    |> validate_required([:purpose, :token_hash, :expires_at])
    |> validate_inclusion(:purpose, @purposes)
    |> validate_subject()
    |> validate_verification_stage()
    |> validate_format(:email, ~r/^[^@,;\s]+@[^@,;\s]+$/,
      message: "must have the @ sign and no spaces"
    )
    |> validate_length(:email, max: 160)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint(:token_hash)
    |> unique_constraint([:purpose, :email])
    |> unique_constraint([:purpose, :user_id])
    |> check_constraint(:email, name: :auth_challenges_email_normalized)
    |> check_constraint(:email, name: :auth_challenges_email_length)
    |> check_constraint(:purpose, name: :auth_challenges_purpose)
    |> check_constraint(:purpose, name: :auth_challenges_subject)
    |> check_constraint(:purpose, name: :auth_challenges_stage)
  end

  def consume_changeset(challenge, now \\ DateTime.utc_now(:second)) do
    change(challenge, consumed_at: now)
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

  def signup_verification_purpose, do: @signup_verification
  def signup_completion_purpose, do: @signup_completion
  def password_reset_verification_purpose, do: @password_reset_verification
  def password_reset_completion_purpose, do: @password_reset_completion
  def completion_expires_in, do: @completion_validity_in_minutes * 60

  defp build(purpose, subject, now, validity_in_seconds) do
    secret = :crypto.strong_rand_bytes(@rand_size)

    challenge =
      struct!(
        __MODULE__,
        Map.merge(subject, %{
          purpose: purpose,
          token_hash: hash(secret),
          expires_at: DateTime.add(now, validity_in_seconds, :second)
        })
      )

    {encode(secret), challenge}
  end

  defp validate_subject(changeset) do
    purpose = get_field(changeset, :purpose)
    email = get_field(changeset, :email)
    user_id = get_field(changeset, :user_id)

    cond do
      purpose in [@signup_verification, @signup_completion] and not is_nil(user_id) ->
        add_error(changeset, :user_id, "must be empty for signup challenges")

      purpose in [@signup_verification, @signup_completion] ->
        validate_required(changeset, [:email])

      purpose in [@password_reset_verification, @password_reset_completion] and
          not is_nil(email) ->
        add_error(changeset, :email, "must be empty for password reset challenges")

      purpose in [@password_reset_verification, @password_reset_completion] ->
        validate_required(changeset, [:user_id])

      true ->
        changeset
    end
  end

  defp validate_verification_stage(changeset) do
    purpose = get_field(changeset, :purpose)
    verified_at = get_field(changeset, :verified_at)

    cond do
      purpose in [@signup_verification, @password_reset_verification] and
          not is_nil(verified_at) ->
        add_error(changeset, :verified_at, "must be empty for verification challenges")

      purpose in [@signup_completion, @password_reset_completion] ->
        validate_required(changeset, [:verified_at])

      true ->
        changeset
    end
  end

  defp encode(secret), do: Base.url_encode64(secret, padding: false)
  defp hash(value), do: :crypto.hash(:sha256, value)
end
