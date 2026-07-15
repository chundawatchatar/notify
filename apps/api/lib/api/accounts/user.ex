defmodule Api.Accounts.User do
  use Ecto.Schema

  import Ecto.Changeset

  @terms_version "v1"

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "users" do
    field :email, :string
    field :password, :string, virtual: true, redact: true
    field :password_confirmation, :string, virtual: true, redact: true
    field :accept_terms, :boolean, virtual: true
    field :hashed_password, :string, redact: true
    field :confirmed_at, :utc_datetime
    field :terms_version, :string
    field :terms_accepted_at, :utc_datetime
    field :last_login_at, :utc_datetime

    has_many :workspace_memberships, Api.Workspaces.Membership
    has_many :auth_challenges, Api.Accounts.AuthChallenge

    timestamps(type: :utc_datetime)
  end

  def signup_completion_changeset(user, attrs, email, confirmed_at) do
    attrs = Map.put(attrs, "email", email)

    user
    |> cast(attrs, [:email, :password, :accept_terms])
    |> update_change(:email, &normalize_email/1)
    |> validate_required([:email, :password, :accept_terms])
    |> validate_format(:email, ~r/^[^@,;\s]+@[^@,;\s]+$/,
      message: "must have the @ sign and no spaces"
    )
    |> validate_length(:email, max: 160)
    |> validate_length(:password, min: 8, max: 72)
    |> validate_acceptance(:accept_terms, message: "must be accepted")
    |> unique_constraint(:email)
    |> check_constraint(:email, name: :users_email_normalized)
    |> check_constraint(:email, name: :users_email_length)
    |> put_terms_acceptance()
    |> put_change(:confirmed_at, confirmed_at)
    |> maybe_hash_password()
  end

  def last_login_changeset(user, now), do: change(user, last_login_at: now)

  def password_reset_changeset(user, attrs) do
    user
    |> cast(attrs, [:password, :password_confirmation])
    |> validate_required([:password, :password_confirmation])
    |> validate_length(:password, min: 8, max: 72)
    |> validate_confirmation(:password, required: true)
    |> maybe_hash_password()
  end

  def valid_password?(%__MODULE__{hashed_password: hash}, password)
      when is_binary(hash) and is_binary(password) and byte_size(password) > 0 do
    Argon2.verify_pass(password, hash)
  end

  def valid_password?(_, _) do
    Argon2.no_user_verify()
    false
  end

  def normalize_email(email) when is_binary(email) do
    email
    |> String.trim()
    |> String.downcase()
  end

  defp put_terms_acceptance(changeset) do
    if get_change(changeset, :accept_terms) == true do
      changeset
      |> put_change(:terms_version, @terms_version)
      |> put_change(:terms_accepted_at, DateTime.utc_now(:second))
    else
      changeset
    end
  end

  defp maybe_hash_password(changeset) do
    password = get_change(changeset, :password)

    if changeset.valid? and is_binary(password) do
      changeset
      |> put_change(:hashed_password, Argon2.hash_pwd_salt(password))
      |> delete_change(:password)
    else
      changeset
    end
  end
end
