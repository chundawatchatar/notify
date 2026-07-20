defmodule Api.Workspaces.Invitation do
  use Ecto.Schema

  import Ecto.Changeset

  alias Api.Accounts.User
  alias Domain.WorkspacePermissions

  @expiry_in_days 7
  @rand_size 32

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspace_invitations" do
    field :email, :string
    field :role, :string
    field :token_hash, :binary, redact: true
    field :expires_at, :utc_datetime
    field :accepted_at, :utc_datetime
    field :revoked_at, :utc_datetime

    belongs_to :workspace, Api.Workspaces.Workspace
    belongs_to :invited_by_membership, Api.Workspaces.Membership

    timestamps(type: :utc_datetime)
  end

  def build(attrs, now \\ DateTime.utc_now(:second)) do
    id = Ecto.UUID.generate()
    secret = :crypto.strong_rand_bytes(@rand_size)

    invitation = %__MODULE__{
      id: id,
      email: User.normalize_email(Map.fetch!(attrs, :email)),
      role: Map.fetch!(attrs, :role),
      workspace_id: Map.fetch!(attrs, :workspace_id),
      invited_by_membership_id: Map.fetch!(attrs, :invited_by_membership_id),
      token_hash: hash(secret),
      expires_at: DateTime.add(now, @expiry_in_days, :day)
    }

    {encode(id, secret), invitation}
  end

  def changeset(invitation, attrs) do
    invitation
    |> cast(attrs, [
      :id,
      :workspace_id,
      :email,
      :role,
      :invited_by_membership_id,
      :token_hash,
      :expires_at,
      :accepted_at,
      :revoked_at
    ])
    |> update_change(:email, &User.normalize_email/1)
    |> validate_required([
      :id,
      :workspace_id,
      :email,
      :role,
      :invited_by_membership_id,
      :token_hash,
      :expires_at
    ])
    |> validate_format(:email, ~r/^[^@,;\s]+@[^@,;\s]+$/)
    |> validate_length(:email, max: 160)
    |> validate_inclusion(:role, WorkspacePermissions.roles())
    |> foreign_key_constraint(:workspace_id)
    |> foreign_key_constraint(:invited_by_membership_id)
    |> unique_constraint(:token_hash)
    |> unique_constraint([:workspace_id, :email],
      name: :workspace_invitations_pending_workspace_email_index
    )
    |> check_constraint(:email, name: :workspace_invitations_email_normalized)
    |> check_constraint(:email, name: :workspace_invitations_email_length)
    |> check_constraint(:role, name: :workspace_invitations_role)
  end

  def revoke_changeset(invitation, now), do: change(invitation, revoked_at: now)
  def accept_changeset(invitation, now), do: change(invitation, accepted_at: now)

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

  def valid_secret?(%__MODULE__{token_hash: expected}, secret)
      when is_binary(expected) and is_binary(secret) do
    provided = hash(secret)
    byte_size(provided) == byte_size(expected) and Plug.Crypto.secure_compare(provided, expected)
  end

  def active?(%__MODULE__{accepted_at: nil, revoked_at: nil, expires_at: expires_at}, now),
    do: DateTime.after?(expires_at, now)

  def active?(_, _), do: false

  defp encode(id, secret), do: id <> "." <> Base.url_encode64(secret, padding: false)
  defp hash(value), do: :crypto.hash(:sha256, value)
end
