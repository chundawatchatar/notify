defmodule ApiWeb.WorkspaceMemberControllerTest do
  use ApiWeb.ConnCase, async: true

  @origin "http://localhost:3100"
  @password "correct-password"

  test "owner can invite, list, and revoke a pending invitation", %{conn: conn} do
    owner = insert(:membership)
    access_token = login(conn, owner.user.email)
    path = ~p"/api/workspaces/#{owner.workspace.slug}/invitations"

    invitation =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(path, %{email: "invitee@example.com", role: "developer"})
      |> json_response(201)

    assert invitation["email"] == "invitee@example.com"
    assert invitation["role"] == "developer"
    refute Map.has_key?(invitation, "token")
    assert_receive {:invitation_email, "invitee@example.com", invitation_url}
    assert String.contains?(invitation_url, "/auth/invitations/accept?token=")

    listed =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(path)
      |> json_response(200)

    assert [listed_invitation] = listed["invitations"]
    assert listed_invitation["id"] == invitation["id"]

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> delete(~p"/api/workspaces/#{owner.workspace.slug}/invitations/#{invitation["id"]}")
    |> response(204)

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> delete(~p"/api/workspaces/#{owner.workspace.slug}/invitations/#{invitation["id"]}")
    |> response(204)
  end

  test "developer can view members but cannot invite people", %{conn: conn} do
    owner = insert(:membership)
    developer = insert(:membership, workspace: owner.workspace, role: "developer")
    access_token = login(conn, developer.user.email)

    members =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/workspaces/#{owner.workspace.slug}/members")
      |> json_response(200)

    assert Enum.any?(members["members"], &(&1["id"] == developer.id))

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(~p"/api/workspaces/#{owner.workspace.slug}/invitations", %{
        email: "invitee@example.com",
        role: "viewer"
      })
      |> json_response(403)

    assert response["errors"]["code"] == "forbidden"

    invitation_list_response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/workspaces/#{owner.workspace.slug}/invitations")
      |> json_response(403)

    assert invitation_list_response["errors"]["code"] == "forbidden"
  end

  test "workspace routes reject other workspaces and malformed resource ids", %{conn: conn} do
    membership = insert(:membership)
    other_workspace = insert(:workspace)
    access_token = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/workspaces/#{other_workspace.slug}/members")
      |> json_response(404)

    assert response["errors"]["code"] == "workspace_not_found"

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> delete(~p"/api/workspaces/#{membership.workspace.slug}/members/not-a-uuid")
    |> json_response(404)

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> delete(~p"/api/workspaces/#{membership.workspace.slug}/invitations/not-a-uuid")
    |> json_response(404)
  end

  test "last-owner and owner-management protections return understandable errors", %{conn: conn} do
    owner = insert(:membership)
    access_token = login(conn, owner.user.email)

    role_update_response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> patch(~p"/api/workspaces/#{owner.workspace.slug}/members/#{owner.id}", %{role: "viewer"})
      |> json_response(422)

    assert role_update_response["errors"]["code"] == "last_owner"

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> delete(~p"/api/workspaces/#{owner.workspace.slug}/members/#{owner.id}")
      |> json_response(422)

    assert response["errors"]["code"] == "last_owner"

    insert(:membership, workspace: owner.workspace, role: "owner")
    admin = insert(:membership, workspace: owner.workspace, role: "admin")
    admin_access_token = login(build_conn(), admin.user.email)

    owner_management_response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{admin_access_token}")
      |> delete(~p"/api/workspaces/#{owner.workspace.slug}/members/#{owner.id}")
      |> json_response(403)

    assert owner_management_response["errors"]["code"] == "forbidden"
  end

  test "invalid invitation email returns validation errors without attempting delivery", %{
    conn: conn
  } do
    owner = insert(:membership)
    access_token = login(conn, owner.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> post(~p"/api/workspaces/#{owner.workspace.slug}/invitations", %{
        email: "invalid-email",
        role: "viewer"
      })
      |> json_response(422)

    assert response["errors"]["code"] == "validation_failed"
    assert response["errors"]["fields"]["email"]
    refute_receive {:invitation_email, _, _}
  end

  defp login(conn, email) do
    response =
      conn
      |> put_req_header("origin", @origin)
      |> post(~p"/api/auth/login", %{email: email, password: @password})
      |> json_response(200)

    response["access_token"]
  end
end
