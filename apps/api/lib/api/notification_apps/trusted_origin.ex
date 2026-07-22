defmodule Api.NotificationApps.TrustedOrigin do
  use Ecto.Schema

  import Ecto.Changeset

  alias Domain.TrustedOrigin, as: TrustedOriginPolicy

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "environment_trusted_origins" do
    field :origin, :string

    belongs_to :environment, Api.NotificationApps.Environment, foreign_key: :app_environment_id

    timestamps(type: :utc_datetime)
  end

  @doc """
  Validates and normalizes a trusted origin before persistence.
  """
  def changeset(trusted_origin, attrs) do
    trusted_origin
    |> cast(attrs, [:app_environment_id, :origin])
    |> normalize_origin()
    |> validate_required([:app_environment_id, :origin])
    |> foreign_key_constraint(:app_environment_id)
    |> unique_constraint(:origin, name: :environment_trusted_origins_environment_id_origin_index)
    |> check_constraint(:origin, name: :environment_trusted_origins_origin_format)
  end

  defp normalize_origin(changeset) do
    case get_change(changeset, :origin) do
      nil ->
        changeset

      origin when is_binary(origin) ->
        case TrustedOriginPolicy.normalize(origin) do
          {:ok, normalized_origin} ->
            put_change(changeset, :origin, normalized_origin)

          {:error, :invalid_origin} ->
            add_error(changeset, :origin, "must be an exact HTTP(S) origin")
        end

      _other ->
        add_error(changeset, :origin, "must be an exact HTTP(S) origin")
    end
  end
end
