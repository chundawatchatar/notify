defmodule ApiWeb.AuthControllerTest do
  use ApiWeb.ConnCase, async: true

  alias Api.Accounts.User
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
    membership = insert(:membership)
    {login_conn, response} = login(conn, membership.user.email)

    assert response["token_type"] == "Bearer"
    assert response["expires_in"] == 900
    assert response["user"]["id"] == membership.user.id
    assert response["workspace"]["id"] == membership.workspace.id
    assert response["role"] == "owner"
    assert login_conn.resp_cookies["_notify_refresh"].http_only
    assert Repo.get!(User, membership.user.id).last_login_at

    me_response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{response["access_token"]}")
      |> get(~p"/api/auth/me")
      |> json_response(200)

    assert me_response["workspace"]["id"] == membership.workspace.id
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
end
