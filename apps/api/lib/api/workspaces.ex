defmodule Api.Workspaces do
  @moduledoc """
  Workspace membership persistence and owner-sensitive transactions.
  """

  import Ecto.Query

  alias Api.Repo
  alias Api.Workspaces.{Membership, OwnerProtection, Workspace}
  alias Ecto.Multi

  @doc """
  Changes a membership role without allowing the final owner to be demoted.
  """
  def update_membership_role(%Membership{id: membership_id, workspace_id: workspace_id}, role) do
    Multi.new()
    |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, workspace_id) end)
    |> Multi.run(:membership, fn repo, _changes -> lock_membership(repo, membership_id) end)
    |> Multi.run(:owner_protection, fn repo, %{membership: membership} ->
      OwnerProtection.ensure_owner_retained(repo, membership, role)
    end)
    |> Multi.update(:updated_membership, fn %{membership: membership} ->
      Membership.role_changeset(membership, role)
    end)
    |> Repo.transaction()
    |> normalize_membership_result(:updated_membership)
  end

  @doc """
  Removes a membership without allowing the final owner to be removed.
  """
  def remove_membership(%Membership{id: membership_id, workspace_id: workspace_id}) do
    Multi.new()
    |> Multi.run(:workspace, fn repo, _changes -> lock_workspace(repo, workspace_id) end)
    |> Multi.run(:membership, fn repo, _changes -> lock_membership(repo, membership_id) end)
    |> Multi.run(:owner_protection, fn repo, %{membership: membership} ->
      OwnerProtection.ensure_owner_retained(repo, membership, nil)
    end)
    |> Multi.delete(:removed_membership, fn %{membership: membership} -> membership end)
    |> Repo.transaction()
    |> normalize_membership_result(:removed_membership)
  end

  defp lock_membership(repo, membership_id) do
    case repo.one(
           from membership in Membership,
             where: membership.id == ^membership_id,
             lock: "FOR UPDATE"
         ) do
      %Membership{} = membership -> {:ok, membership}
      nil -> {:error, :membership_not_found}
    end
  end

  defp lock_workspace(repo, workspace_id) do
    case repo.one(
           from workspace in Workspace,
             where: workspace.id == ^workspace_id,
             lock: "FOR UPDATE"
         ) do
      %Workspace{} -> {:ok, :locked}
      nil -> {:error, :workspace_not_found}
    end
  end

  defp normalize_membership_result({:ok, result}, result_key),
    do: {:ok, Map.fetch!(result, result_key)}

  defp normalize_membership_result({:error, :owner_protection, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, :membership, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, :workspace, reason, _changes}, _result_key),
    do: {:error, reason}

  defp normalize_membership_result({:error, _operation, value, _changes}, _result_key),
    do: {:error, value}
end
