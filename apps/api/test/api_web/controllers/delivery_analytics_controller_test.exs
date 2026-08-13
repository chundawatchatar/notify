defmodule ApiWeb.DeliveryAnalyticsControllerTest do
  use ApiWeb.ConnCase, async: false

  alias Api.NotificationApps
  alias Api.NotificationIngress
  alias Api.NotificationIngress.EventOutbox

  @origin "http://localhost:3100"
  @password "correct-password"

  test "returns scoped counts, publication latency, trend buckets, and app rows", %{conn: conn} do
    membership = insert(:membership, role: "viewer")
    notification_app = create_app!(membership.workspace, "Payments")
    environment = environment(notification_app, "development")
    accepted_at = DateTime.add(DateTime.utc_now(:second), -60 * 60, :second)

    accept_event!(membership.workspace, notification_app, environment, accepted_at, :pending)

    accept_event!(
      membership.workspace,
      notification_app,
      environment,
      DateTime.add(accepted_at, 60),
      :published
    )

    access_token = login(conn, membership.user.email)

    response =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(
        ~p"/api/analytics?window=24h&appId=#{notification_app.id}&environmentId=#{environment.id}"
      )
      |> json_response(200)

    assert response["window"]["name"] == "24h"
    assert is_binary(response["window"]["start_at"])
    assert is_binary(response["window"]["as_of"])

    assert response["filters"] == %{
             "app_id" => notification_app.id,
             "environment_id" => environment.id
           }

    assert response["totals"] == %{
             "counts" => %{
               "accepted" => 2,
               "pending" => 1,
               "processing" => 0,
               "published" => 1,
               "unpublished" => 1,
               "publication_rate" => %{
                 "numerator" => 1,
                 "denominator" => 2,
                 "value" => 0.5
               }
             },
             "publication_latency" => %{
               "sample_count" => 1,
               "p50_ms" => 1_000,
               "p95_ms" => 1_000
             }
           }

    assert length(response["trend"]) == 24
    assert Enum.sum(Enum.map(response["trend"], & &1["counts"]["accepted"])) == 2

    assert [app_row] = response["apps"]
    assert app_row["app_id"] == notification_app.id
    assert app_row["name"] == notification_app.name
    refute app_row["archived"]
    assert app_row["metrics"] == response["totals"]
  end

  test "rejects unsupported windows and environment-only filters", %{conn: conn} do
    membership = insert(:membership)
    notification_app = create_app!(membership.workspace, "Payments")
    environment = environment(notification_app, "development")
    access_token = login(conn, membership.user.email)

    invalid_window =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/analytics?window=1h")
      |> json_response(422)

    assert invalid_window["errors"]["code"] == "invalid_analytics_window"

    invalid_scope =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/analytics?window=24h&environmentId=#{environment.id}")
      |> json_response(422)

    assert invalid_scope["errors"]["code"] == "invalid_analytics_scope"
  end

  test "unknown and cross-workspace app filters share the same not-found response", %{conn: conn} do
    membership = insert(:membership)
    other_membership = insert(:membership)
    other_app = create_app!(other_membership.workspace, "Other workspace")
    access_token = login(conn, membership.user.email)

    cross_workspace =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/analytics?window=24h&appId=#{other_app.id}")
      |> json_response(404)

    unknown =
      build_conn()
      |> put_req_header("authorization", "Bearer #{access_token}")
      |> get(~p"/api/analytics?window=24h&appId=#{Ecto.UUID.generate()}")
      |> json_response(404)

    assert cross_workspace == unknown
    assert cross_workspace["errors"]["code"] == "analytics_scope_not_found"
  end

  test "requires an access token", %{conn: conn} do
    response =
      conn
      |> get(~p"/api/analytics?window=24h")
      |> json_response(401)

    assert response["errors"]["code"] == "invalid_access_token"
  end

  defp login(conn, email) do
    response =
      conn
      |> put_req_header("origin", @origin)
      |> post(~p"/api/auth/login", %{email: email, password: @password})
      |> json_response(200)

    response["access_token"]
  end

  defp create_app!(workspace, name) do
    assert {:ok, notification_app} =
             NotificationApps.create_notification_app(workspace, %{name: name})

    notification_app
  end

  defp environment(notification_app, slug) do
    Enum.find(notification_app.environments, &(&1.environment_slug == slug))
  end

  defp accept_event!(workspace, notification_app, environment, accepted_at, status) do
    nonce = Ecto.UUID.generate()

    source = %{
      workspace_id: workspace.id,
      notification_app_id: notification_app.id,
      app_environment_id: environment.id,
      source_kind: "dashboard_test"
    }

    attrs = %{
      event_name: "analytics.sample",
      recipient_id: "recipient_#{nonce}",
      payload: %{"sample" => true},
      idempotency_key_digest: digest("idempotency-#{nonce}"),
      request_fingerprint: digest("request-#{nonce}")
    }

    assert {:ok, %{outbox: outbox}} =
             NotificationIngress.accept_event(source, attrs, accepted_at)

    if status == :published do
      outbox
      |> EventOutbox.changeset(%{
        status: "published",
        published_at: DateTime.add(accepted_at, 1, :second)
      })
      |> Api.Repo.update!()
    end
  end

  defp digest(value), do: :crypto.hash(:sha256, value)
end
