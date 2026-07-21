defmodule ApiWeb.AuthControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.Accounts.User
  alias Api.Accounts.AccessToken
  alias Api.Repo

  @origin "http://localhost:3100"
  @password "correct-password"

  test "verified email is required before signup creates the owner workspace", %{conn: conn} do
    signup_response =
      conn
      |> post(~p"/api/auth/signup", %{email: " Owner@Example.COM "})
      |> json_response(202)

    assert signup_response["status"] == "verification_sent"
    assert_receive {:verification_email, "owner@example.com", verification_url}
    assert Repo.aggregate(User, :count) == 0

    verification_token =
      verification_url
      |> URI.parse()
      |> Map.fetch!(:query)
      |> URI.decode_query()
      |> Map.fetch!("token")

    confirmation_response =
      build_conn()
      |> post(~p"/api/auth/email-verification/confirm", %{token: verification_token})
      |> json_response(200)

    completion_response =
      build_conn()
      |> post(~p"/api/auth/signup/complete", %{
        signup_token: confirmation_response["signup_token"],
        password: @password,
        workspace_name: "Acme Cloud",
        accept_terms: true
      })
      |> json_response(201)

    assert confirmation_response["expires_in"] == 900
    assert completion_response["status"] == "account_created"
    assert Repo.get_by!(User, email: "owner@example.com").confirmed_at
  end

  test "invitation signup issues a target-workspace session without creating an owner workspace",
       %{
         conn: conn
       } do
    inviter = insert(:membership)

    assert {:ok, %{token: token}} =
             Api.Workspaces.create_invitation(inviter, %{
               email: "invited@example.com",
               role: "developer"
             })

    signup_conn =
      conn
      |> with_origin()
      |> post(~p"/api/auth/invitations/signup", %{
        token: token,
        password: @password,
        password_confirmation: @password,
        accept_terms: true
      })

    response = json_response(signup_conn, 201)

    assert response["user"]["email"] == "invited@example.com"
    assert response["workspace"]["id"] == inviter.workspace_id
    assert response["role"] == "developer"
    assert signup_conn.resp_cookies["_notify_refresh"].http_only
  end

  test "an authenticated matching user accepts an invitation into its workspace", %{conn: conn} do
    inviter = insert(:membership)
    invited_user = insert(:user, email: "invited@example.com")
    insert(:membership, user: invited_user)

    assert {:ok, %{token: token}} =
             Api.Workspaces.create_invitation(inviter, %{
               email: invited_user.email,
               role: "viewer"
             })

    {_login_conn, login_response} = login(conn, invited_user.email)

    acceptance_conn =
      build_conn()
      |> with_origin()
      |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
      |> post(~p"/api/auth/invitations/accept", %{token: token})

    response = json_response(acceptance_conn, 200)

    assert response["workspace"]["id"] == inviter.workspace_id
    assert response["role"] == "viewer"
    assert acceptance_conn.resp_cookies["_notify_refresh"].http_only
  end

  test "login does not reveal unknown credentials but requires verification after a valid password",
       %{conn: conn} do
    membership = insert(:membership, user: build(:user, confirmed_at: nil))

    unknown_response =
      conn
      |> with_origin()
      |> post(~p"/api/auth/login", %{email: "missing@example.com", password: @password})
      |> json_response(401)

    assert unknown_response["errors"]["code"] == "invalid_credentials"

    unverified_response =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/login", %{email: membership.user.email, password: @password})
      |> json_response(403)

    assert unverified_response["errors"]["code"] == "email_not_verified"
  end

  test "login issues a refresh cookie and bearer token scoped to the current workspace", %{
    conn: conn
  } do
    owner_membership = insert(:membership)
    membership = insert(:membership, workspace: owner_membership.workspace, role: "admin")
    {login_conn, response} = login(conn, membership.user.email)

    assert response["token_type"] == "Bearer"
    assert response["expires_in"] == 900
    assert response["user"]["id"] == membership.user.id
    assert response["workspace"]["id"] == membership.workspace.id
    assert response["workspace"]["slug"] == membership.workspace.slug
    assert response["role"] == "admin"
    assert login_conn.resp_cookies["_notify_refresh"].http_only
    assert Repo.get!(User, membership.user.id).last_login_at

    me_response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{response["access_token"]}")
      |> get(~p"/api/auth/me")
      |> json_response(200)

    assert me_response["workspace"]["id"] == membership.workspace.id
    assert me_response["workspace"]["slug"] == membership.workspace.slug
    assert me_response["role"] == "admin"
  end

  test "remember extends the refresh session from one day to thirty days", %{conn: conn} do
    membership = insert(:membership)

    standard_conn =
      conn
      |> with_origin()
      |> post(~p"/api/auth/login", %{
        email: membership.user.email,
        password: @password,
        remember: false
      })

    remembered_conn =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/login", %{
        email: membership.user.email,
        password: @password,
        remember: true
      })

    assert_in_delta standard_conn.resp_cookies["_notify_refresh"].max_age, 86_400, 1
    assert_in_delta remembered_conn.resp_cookies["_notify_refresh"].max_age, 2_592_000, 1
  end

  test "refresh rotates the cookie and replay revokes the session", %{conn: conn} do
    membership = insert(:membership)
    {login_conn, login_response} = login(conn, membership.user.email)
    first_refresh_token = login_conn.resp_cookies["_notify_refresh"].value

    refresh_conn =
      build_conn()
      |> with_origin()
      |> put_req_cookie("_notify_refresh", first_refresh_token)
      |> post(~p"/api/auth/refresh", %{})

    refresh_response = json_response(refresh_conn, 200)
    second_refresh_token = refresh_conn.resp_cookies["_notify_refresh"].value

    refute first_refresh_token == second_refresh_token
    assert refresh_response["workspace"]["slug"] == membership.workspace.slug

    replay_response =
      build_conn()
      |> with_origin()
      |> put_req_cookie("_notify_refresh", first_refresh_token)
      |> post(~p"/api/auth/refresh", %{})
      |> json_response(401)

    assert replay_response["errors"]["code"] == "invalid_refresh_token"

    build_conn()
    |> put_req_header("authorization", "Bearer #{refresh_response["access_token"]}")
    |> get(~p"/api/auth/me")
    |> json_response(401)

    build_conn()
    |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
    |> get(~p"/api/auth/me")
    |> json_response(401)
  end

  test "lists only active memberships for the authenticated user", %{conn: conn} do
    membership = insert(:membership)
    other_workspace_owner = insert(:membership)

    active_membership =
      insert(:membership,
        user: membership.user,
        workspace: other_workspace_owner.workspace,
        role: "developer"
      )

    removed_workspace_owner = insert(:membership)

    insert(:membership,
      user: membership.user,
      workspace: removed_workspace_owner.workspace,
      role: "viewer",
      status: "removed",
      removed_at: DateTime.utc_now(:second)
    )

    {_login_conn, login_response} = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
      |> get(~p"/api/workspaces")
      |> json_response(200)

    assert Enum.sort(response["workspaces"], &(&1["id"] <= &2["id"])) ==
             Enum.sort(
               [
                 %{
                   "id" => membership.workspace.id,
                   "name" => membership.workspace.name,
                   "slug" => membership.workspace.slug,
                   "role" => membership.role
                 },
                 %{
                   "id" => active_membership.workspace.id,
                   "name" => active_membership.workspace.name,
                   "slug" => active_membership.workspace.slug,
                   "role" => "developer"
                 }
               ],
               &(&1["id"] <= &2["id"])
             )
  end

  test "switching workspaces revokes the old session and rotates credentials", %{conn: conn} do
    membership = insert(:membership)
    target_workspace_owner = insert(:membership)

    target_membership =
      insert(:membership,
        user: membership.user,
        workspace: target_workspace_owner.workspace,
        role: "developer"
      )

    {login_conn, login_response} = login(conn, membership.user.email)
    old_refresh_token = login_conn.resp_cookies["_notify_refresh"].value

    switch_conn =
      build_conn()
      |> with_origin()
      |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
      |> post(~p"/api/auth/workspace/switch", %{workspace_slug: target_membership.workspace.slug})

    response = json_response(switch_conn, 200)

    assert response["workspace"] == %{
             "id" => target_membership.workspace.id,
             "name" => target_membership.workspace.name,
             "slug" => target_membership.workspace.slug
           }

    assert response["role"] == "developer"
    refute switch_conn.resp_cookies["_notify_refresh"].value == old_refresh_token

    {:ok, claims} = AccessToken.verify_access(response["access_token"])
    assert claims["sub"] == membership.user.id
    assert claims["wid"] == target_membership.workspace.id
    refute Map.has_key?(claims, "role")
    refute Map.has_key?(claims, "slug")

    build_conn()
    |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
    |> get(~p"/api/auth/me")
    |> json_response(401)

    build_conn()
    |> with_origin()
    |> put_req_cookie("_notify_refresh", old_refresh_token)
    |> post(~p"/api/auth/refresh", %{})
    |> json_response(401)
  end

  test "switching to an inaccessible workspace fails without exposing it", %{conn: conn} do
    membership = insert(:membership)
    inaccessible_workspace = insert(:workspace)
    {_login_conn, login_response} = login(conn, membership.user.email)

    response =
      build_conn()
      |> with_origin()
      |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
      |> post(~p"/api/auth/workspace/switch", %{workspace_slug: inaccessible_workspace.slug})
      |> json_response(404)

    assert response["errors"]["code"] == "workspace_not_found"
  end

  test "workspace switching rejects a missing origin before rotating credentials", %{conn: conn} do
    membership = insert(:membership)
    {_login_conn, login_response} = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{login_response["access_token"]}")
      |> post(~p"/api/auth/workspace/switch", %{workspace_slug: membership.workspace.slug})
      |> json_response(403)

    assert response["errors"]["code"] == "origin_not_allowed"
  end

  test "password reset requests do not reveal whether an account exists", %{conn: conn} do
    membership = insert(:membership)

    existing_response =
      conn
      |> with_origin()
      |> post(~p"/api/auth/password-reset", %{email: membership.user.email})
      |> json_response(202)

    assert existing_response["status"] == "password_reset_requested"
    assert_receive {:password_reset_email, email, _url}
    assert email == membership.user.email

    missing_response =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/password-reset", %{email: "missing@example.com"})
      |> json_response(202)

    assert missing_response == existing_response
    refute_receive {:password_reset_email, "missing@example.com", _url}
  end

  test "password reset is one-time and revokes existing sessions", %{conn: conn} do
    membership = insert(:membership)
    {_login_conn, login_response} = login(conn, membership.user.email)
    access_token = login_response["access_token"]

    build_conn()
    |> with_origin()
    |> post(~p"/api/auth/password-reset", %{email: membership.user.email})
    |> json_response(202)

    assert_receive {:password_reset_email, _, reset_url}
    request_token = token_from_url(reset_url)

    confirmation_response =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/password-reset/confirm", %{token: request_token})
      |> json_response(200)

    reset_token = confirmation_response["reset_token"]
    assert confirmation_response["expires_in"] == 900

    completion_response =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/password-reset/complete", %{
        reset_token: reset_token,
        password: "new-correct-password",
        password_confirmation: "new-correct-password"
      })
      |> json_response(200)

    assert completion_response["status"] == "password_reset"

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> get(~p"/api/auth/me")
    |> json_response(401)

    build_conn()
    |> with_origin()
    |> post(~p"/api/auth/login", %{email: membership.user.email, password: @password})
    |> json_response(401)

    build_conn()
    |> with_origin()
    |> post(~p"/api/auth/login", %{
      email: membership.user.email,
      password: "new-correct-password"
    })
    |> json_response(200)

    replay_response =
      build_conn()
      |> with_origin()
      |> post(~p"/api/auth/password-reset/complete", %{
        reset_token: reset_token,
        password: "another-password",
        password_confirmation: "another-password"
      })
      |> json_response(400)

    assert replay_response["errors"]["code"] == "invalid_password_reset_token"
  end

  test "logout is idempotent and immediately revokes the access token", %{conn: conn} do
    membership = insert(:membership)
    {login_conn, login_response} = login(conn, membership.user.email)
    refresh_token = login_conn.resp_cookies["_notify_refresh"].value
    access_token = login_response["access_token"]

    logout_conn =
      build_conn()
      |> with_origin()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> put_req_cookie("_notify_refresh", refresh_token)
      |> delete(~p"/api/auth/session")

    assert response(logout_conn, 204) == ""
    assert logout_conn.resp_cookies["_notify_refresh"].max_age == 0

    build_conn()
    |> put_req_header("authorization", "Bearer #{access_token}")
    |> get(~p"/api/auth/me")
    |> json_response(401)

    build_conn()
    |> with_origin()
    |> put_req_cookie("_notify_refresh", refresh_token)
    |> delete(~p"/api/auth/session")
    |> response(204)
  end

  test "cookie-mutating endpoints reject an unapproved or missing origin", %{conn: conn} do
    membership = insert(:membership)

    response =
      post(conn, ~p"/api/auth/login", %{email: membership.user.email, password: @password})
      |> json_response(403)

    assert response["errors"]["code"] == "origin_not_allowed"
  end

  defp login(conn, email) do
    conn =
      conn
      |> with_origin()
      |> post(~p"/api/auth/login", %{email: email, password: @password, remember: true})

    {conn, json_response(conn, 200)}
  end

  defp with_origin(conn), do: put_req_header(conn, "origin", @origin)

  defp token_from_url(url) do
    url
    |> URI.parse()
    |> Map.fetch!(:query)
    |> URI.decode_query()
    |> Map.fetch!("token")
  end
end
