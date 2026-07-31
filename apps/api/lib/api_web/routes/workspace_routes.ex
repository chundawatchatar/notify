defmodule ApiWeb.Routes.WorkspaceRoutes do
  @moduledoc false

  defmacro workspace_member_routes do
    quote do
      get "/workspaces/:workspaceSlug/members", WorkspaceMemberController, :index
      patch "/workspaces/:workspaceSlug/members/:membershipId", WorkspaceMemberController, :update
      delete "/workspaces/:workspaceSlug/members/:membershipId", WorkspaceMemberController, :delete
      get "/workspaces/:workspaceSlug/invitations", WorkspaceMemberController, :list_invitations
      post "/workspaces/:workspaceSlug/invitations", WorkspaceMemberController, :create_invitation

      delete "/workspaces/:workspaceSlug/invitations/:invitationId",
             WorkspaceMemberController,
             :revoke_invitation
    end
  end
end
