defmodule Api.Workspaces.OwnerProtection do
  @moduledoc """
  Transaction helpers that preserve at least one workspace owner.
  """

  import Ecto.Query

  alias Api.Workspaces.Membership

  @doc """
  Locks workspace owners and rejects a change that would demote the final owner.

  Call this inside the transaction that changes or removes a membership.
  """
  def ensure_owner_retained(_repo, %Membership{role: "owner"}, "owner"), do: {:ok, :retained}

  def ensure_owner_retained(repo, %Membership{role: "owner", workspace_id: workspace_id}, _role) do
    owner_ids =
      repo.all(
        from membership in Membership,
          where:
            membership.workspace_id == ^workspace_id and membership.role == "owner" and
              membership.status == "active",
          lock: "FOR UPDATE",
          select: membership.id
      )

    if length(owner_ids) > 1, do: {:ok, :retained}, else: {:error, :last_active_owner}
  end

  def ensure_owner_retained(_repo, _membership, _role), do: {:ok, :retained}
end
