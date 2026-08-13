import type { ApiDeliveryAnalyticsResponse } from "@notify/api-client";
import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notify/ui";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { getDeliveryAnalytics } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { formatDate, requestErrorMessage } from "@/lib/form-utils";
import { workspaceQueryKey } from "@/lib/workspace-queries";

type AnalyticsWindow = ApiDeliveryAnalyticsResponse["window"]["name"];
type AnalyticsMetrics = ApiDeliveryAnalyticsResponse["totals"];

const analyticsWindows: readonly AnalyticsWindow[] = ["24h", "7d", "30d"];
const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

function AnalyticsContent({ workspaceSlug }: Readonly<{ workspaceSlug: string }>) {
  const auth = useAuth();
  const [window, setWindow] = useState<AnalyticsWindow>("24h");
  const analyticsQuery = useQuery({
    queryKey: workspaceQueryKey(workspaceSlug, "analytics", window),
    queryFn: () =>
      auth.authenticatedRequest((accessToken) => getDeliveryAnalytics(accessToken, window)),
  });

  if (analyticsQuery.isPending) {
    return (
      <AnalyticsMessage
        description="Loading workspace handoff metrics."
        title="Loading analytics..."
      />
    );
  }

  if (analyticsQuery.isError) {
    return (
      <Alert severity="error">
        <AlertTitle>Analytics could not be loaded</AlertTitle>
        <div className="flex flex-wrap items-center gap-3">
          <span>{requestErrorMessage(analyticsQuery.error)}</span>
          <Button onClick={() => void analyticsQuery.refetch()} size="sm" variant="outline">
            <RefreshCw />
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const analytics = analyticsQuery.data;
  const { counts } = analytics.totals;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-sm border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-sm">Analytics window</p>
          <p className="text-muted-foreground text-xs">
            Fixed UTC window ending{" "}
            {formatDate(analytics.window.as_of, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            })}
            .
          </p>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Analytics window</legend>
          {analyticsWindows.map((option) => (
            <Button
              aria-pressed={window === option}
              key={option}
              onClick={() => setWindow(option)}
              size="sm"
              variant={window === option ? "default" : "outline"}
            >
              {windowLabel(option)}
            </Button>
          ))}
        </fieldset>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric
          detail="Events accepted in this window"
          label="Accepted"
          value={formatCount(counts.accepted)}
        />
        <AnalyticsMetric
          detail="Best-effort PubSub handoffs"
          label="Published"
          value={formatCount(counts.published)}
        />
        <AnalyticsMetric
          detail="Pending plus processing"
          label="Unpublished"
          value={formatCount(counts.unpublished)}
        />
        <AnalyticsMetric
          detail={`${formatCount(counts.publication_rate.numerator)} of ${formatCount(counts.publication_rate.denominator)} accepted events`}
          label="Publication rate"
          value={formatRate(counts.publication_rate.value)}
        />
      </div>

      {counts.accepted === 0 ? (
        <AnalyticsMessage
          description="Counts remain zero and rate or latency values remain unavailable until an event enters this window."
          title="No accepted events in this window."
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <HandoffStateCard metrics={analytics.totals} />
            <PublicationLatencyCard metrics={analytics.totals} />
          </div>
          <TrendTable analytics={analytics} />
          <AppBreakdown analytics={analytics} />
        </>
      )}
    </div>
  );
}

function AnalyticsMetric({
  detail,
  label,
  value,
}: Readonly<{ detail: string; label: string; value: string }>) {
  return (
    <StatCard>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 font-semibold text-2xl">{value}</p>
      <p className="mt-3 text-muted-foreground text-sm">{detail}</p>
    </StatCard>
  );
}

function HandoffStateCard({ metrics }: Readonly<{ metrics: AnalyticsMetrics }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current handoff state</CardTitle>
        <CardDescription>
          Published means Phoenix PubSub accepted the broadcast request. It does not confirm client
          receipt.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <MetricValue label="Pending" value={formatCount(metrics.counts.pending)} />
        <MetricValue label="Processing" value={formatCount(metrics.counts.processing)} />
        <MetricValue label="Published" value={formatCount(metrics.counts.published)} />
      </CardContent>
    </Card>
  );
}

function PublicationLatencyCard({ metrics }: Readonly<{ metrics: AnalyticsMetrics }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publication latency</CardTitle>
        <CardDescription>
          Time from event acceptance to the PubSub handoff for published samples only.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <MetricValue label="P50" value={formatLatency(metrics.publication_latency.p50_ms)} />
        <MetricValue label="P95" value={formatLatency(metrics.publication_latency.p95_ms)} />
        <MetricValue
          label="Samples"
          value={formatCount(metrics.publication_latency.sample_count)}
        />
      </CardContent>
    </Card>
  );
}

function MetricValue({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-lg">{value}</p>
    </div>
  );
}

function TrendTable({ analytics }: Readonly<{ analytics: ApiDeliveryAnalyticsResponse }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Handoff trend</CardTitle>
        <CardDescription>
          Accepted-event cohorts grouped into the fixed UTC buckets for this window.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bucket start</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Processing</TableHead>
              <TableHead className="text-right">Published</TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.trend.map((bucket) => (
              <TableRow key={bucket.start_at}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(bucket.start_at, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}
                </TableCell>
                <TableCell className="text-right">{formatCount(bucket.counts.accepted)}</TableCell>
                <TableCell className="text-right">{formatCount(bucket.counts.pending)}</TableCell>
                <TableCell className="text-right">
                  {formatCount(bucket.counts.processing)}
                </TableCell>
                <TableCell className="text-right">{formatCount(bucket.counts.published)}</TableCell>
                <TableCell className="text-right">
                  {formatRate(bucket.counts.publication_rate.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AppBreakdown({ analytics }: Readonly<{ analytics: ApiDeliveryAnalyticsResponse }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App breakdown</CardTitle>
        <CardDescription>
          Apps represented by accepted events in the selected window.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Published</TableHead>
              <TableHead className="text-right">Publication rate</TableHead>
              <TableHead className="text-right">P95 latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analytics.apps.map((app) => (
              <TableRow key={app.app_id}>
                <TableCell>
                  <span className="font-medium">{app.name}</span>
                  {app.archived ? (
                    <Badge className="ml-2" variant="secondary">
                      Archived
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  {formatCount(app.metrics.counts.accepted)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCount(app.metrics.counts.published)}
                </TableCell>
                <TableCell className="text-right">
                  {formatRate(app.metrics.counts.publication_rate.value)}
                </TableCell>
                <TableCell className="text-right">
                  {formatLatency(app.metrics.publication_latency.p95_ms)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AnalyticsMessage({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <Card>
      <CardContent className="grid gap-2 py-8">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatRate(value: number | null) {
  return value === null ? "No data" : percentFormatter.format(value);
}

function formatLatency(value: number | null) {
  return value === null ? "No data" : `${formatCount(value)} ms`;
}

function windowLabel(window: AnalyticsWindow) {
  if (window === "24h") return "24 hours";
  if (window === "7d") return "7 days";
  return "30 days";
}

export { AnalyticsContent };
