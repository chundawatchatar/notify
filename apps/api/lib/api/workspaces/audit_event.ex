defmodule Api.Workspaces.AuditEvent do
  use Ecto.Schema

  import Ecto.Changeset

  @metadata_max_bytes 4_096
  @forbidden_metadata_key_fragments ["token", "password", "secret", "hash"]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "workspace_audit_events" do
    belongs_to :workspace, Api.Workspaces.Workspace

    belongs_to :actor_workspace_membership, Api.Workspaces.Membership,
      foreign_key: :actor_workspace_membership_id

    field :action, :string
    field :target_type, :string
    field :target_id, :binary_id
    field :metadata, :map, default: %{}

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [
      :workspace_id,
      :actor_workspace_membership_id,
      :action,
      :target_type,
      :target_id,
      :metadata
    ])
    |> validate_required([:workspace_id, :action, :target_type, :metadata])
    |> validate_length(:action, min: 1, max: 80)
    |> validate_length(:target_type, min: 1, max: 80)
    |> validate_metadata_size()
    |> validate_safe_metadata()
    |> foreign_key_constraint(:workspace_id)
    |> foreign_key_constraint(:actor_workspace_membership_id)
    |> check_constraint(:action, name: :workspace_audit_events_action_length)
    |> check_constraint(:target_type, name: :workspace_audit_events_target_type_length)
  end

  defp validate_metadata_size(changeset) do
    validate_change(changeset, :metadata, fn :metadata, metadata ->
      try do
        case Jason.encode(metadata) do
          {:ok, encoded} when byte_size(encoded) <= @metadata_max_bytes -> []
          {:ok, _encoded} -> [metadata: "must be at most #{@metadata_max_bytes} bytes"]
          {:error, _reason} -> [metadata: "must be JSON encodable"]
        end
      rescue
        Protocol.UndefinedError -> [metadata: "must be JSON encodable"]
      end
    end)
  end

  defp validate_safe_metadata(changeset) do
    validate_change(changeset, :metadata, fn :metadata, metadata ->
      if contains_forbidden_metadata_key?(metadata) do
        [metadata: "must not contain credential or token material"]
      else
        []
      end
    end)
  end

  defp contains_forbidden_metadata_key?(metadata) when is_map(metadata) do
    Enum.any?(metadata, fn {key, value} ->
      forbidden_metadata_key?(key) or
        contains_forbidden_metadata_key?(value)
    end)
  end

  defp contains_forbidden_metadata_key?(metadata) when is_list(metadata),
    do: Enum.any?(metadata, &contains_forbidden_metadata_key?/1)

  defp contains_forbidden_metadata_key?(_metadata), do: false

  defp forbidden_metadata_key?(key) when is_binary(key), do: contains_forbidden_key_fragment?(key)

  defp forbidden_metadata_key?(key) when is_atom(key),
    do: key |> Atom.to_string() |> contains_forbidden_key_fragment?()

  defp forbidden_metadata_key?(_key), do: false

  defp contains_forbidden_key_fragment?(key) do
    normalized_key = String.downcase(key)

    Enum.any?(@forbidden_metadata_key_fragments, &String.contains?(normalized_key, &1))
  end
end
