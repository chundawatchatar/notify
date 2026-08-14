defmodule ApiWeb.WorkspaceSettingsControllerTest do
  use ApiWeb.ConnCase, async: true

  @origin "http://localhost:3100"
  @password "correct-password"

  test "an owner can read and partially update complete workspace settings", %{conn: conn} do
    membership = insert(:membership, role: "owner")
    access_token = login(conn, membership.user.email)

    assert settings(conn, access_token, membership.workspace.slug) == %{
             "settings" => %{
               "name" => membership.workspace.name,
               "slug" => membership.workspace.slug,
               "timezone" => "UTC",
               "default_environment" => "development"
             }
           }

    response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{membership.workspace.slug}/settings", %{
        name: "  Acme Platform  "
      })
      |> json_response(200)

    assert response == %{
             "settings" => %{
               "name" => "Acme Platform",
               "slug" => membership.workspace.slug,
               "timezone" => "UTC",
               "default_environment" => "development"
             }
           }

    workspace = Api.Repo.reload!(membership.workspace)
    assert workspace.name == "Acme Platform"
    assert workspace.slug == membership.workspace.slug
    assert workspace.timezone == "UTC"
  end

  test "viewer memberships can read settings but cannot update them", %{conn: conn} do
    membership = insert(:membership, role: "viewer")
    access_token = login(conn, membership.user.email)

    assert settings(conn, access_token, membership.workspace.slug)["settings"]["slug"] ==
             membership.workspace.slug

    response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{membership.workspace.slug}/settings", %{
        timezone: "Asia/Kolkata"
      })
      |> json_response(403)

    assert response["errors"]["code"] == "forbidden"
    assert Api.Repo.reload!(membership.workspace).timezone == "UTC"
  end

  test "invalid, null, unsupported, and empty updates return validation errors atomically", %{
    conn: conn
  } do
    membership = insert(:membership, role: "owner")
    access_token = login(conn, membership.user.email)

    response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{membership.workspace.slug}/settings", %{
        name: "Renamed Workspace",
        timezone: "IST",
        slug: "renamed-workspace"
      })
      |> json_response(422)

    assert response["errors"]["code"] == "validation_failed"
    assert response["errors"]["fields"]["timezone"]
    assert response["errors"]["fields"]["base"] == ["contains unsupported settings fields"]

    empty_response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{membership.workspace.slug}/settings", %{})
      |> json_response(422)

    assert empty_response["errors"]["fields"]["base"] == [
             "must include at least one editable setting"
           ]

    null_response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{membership.workspace.slug}/settings", %{name: nil})
      |> json_response(422)

    assert null_response["errors"]["code"] == "validation_failed"
    assert null_response["errors"]["fields"]["name"] == ["can't be blank"]

    workspace = Api.Repo.reload!(membership.workspace)
    assert workspace.name == membership.workspace.name
    assert workspace.slug == membership.workspace.slug
    assert workspace.timezone == "UTC"
  end

  test "workspace slug resolution does not expose another tenant", %{conn: conn} do
    membership = insert(:membership, role: "owner")
    other_workspace = insert(:workspace, name: "Other Workspace")
    access_token = login(conn, membership.user.email)

    get_response =
      build_conn()
      |> authorize(access_token)
      |> get(~p"/api/workspaces/#{other_workspace.slug}/settings")
      |> json_response(404)

    assert get_response["errors"]["code"] == "workspace_not_found"

    patch_response =
      build_conn()
      |> authorize(access_token)
      |> patch(~p"/api/workspaces/#{other_workspace.slug}/settings", %{name: "Exposed"})
      |> json_response(404)

    assert patch_response["errors"]["code"] == "workspace_not_found"
    assert Api.Repo.reload!(other_workspace).name == "Other Workspace"
  end

  test "settings endpoints require an access token", %{conn: conn} do
    workspace = insert(:workspace)

    get_response =
      conn
      |> get(~p"/api/workspaces/#{workspace.slug}/settings")
      |> json_response(401)

    assert get_response["errors"]["code"] == "invalid_access_token"

    patch_response =
      build_conn()
      |> patch(~p"/api/workspaces/#{workspace.slug}/settings", %{name: "Renamed"})
      |> json_response(401)

    assert patch_response["errors"]["code"] == "invalid_access_token"
  end

  defp settings(conn, access_token, workspace_slug) do
    conn
    |> authorize(access_token)
    |> get(~p"/api/workspaces/#{workspace_slug}/settings")
    |> json_response(200)
  end

  defp authorize(conn, access_token) do
    put_req_header(conn, "authorization", "Bearer #{access_token}")
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
