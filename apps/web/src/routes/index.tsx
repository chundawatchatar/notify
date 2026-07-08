import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notify/ui";
import { createFileRoute } from "@tanstack/react-router";

const metrics = [
  {
    label: "Delivered",
    value: "48.2k",
    detail: "99.3% success rate",
  },
  {
    label: "Queued",
    value: "812",
    detail: "Across 4 channels",
  },
  {
    label: "Templates",
    value: "26",
    detail: "7 changed this week",
  },
  {
    label: "Incidents",
    value: "0",
    detail: "No active delivery issues",
  },
];

const activity = [
  {
    event: "Welcome email delivered",
    channel: "Email",
    time: "2 min ago",
    status: "Delivered",
  },
  {
    event: "Trial expiry reminder queued",
    channel: "Push",
    time: "8 min ago",
    status: "Queued",
  },
  {
    event: "Invoice receipt delivered",
    channel: "Email",
    time: "16 min ago",
    status: "Delivered",
  },
  {
    event: "OTP request throttled",
    channel: "SMS",
    time: "21 min ago",
    status: "Review",
  },
];

export const Route = createFileRoute("/")({
  component: WebDashboard,
});

function WebDashboard() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-semibold text-lg">Notify</p>
            <p className="text-muted-foreground text-sm">Notification operations</p>
          </div>
          <div className="flex items-center gap-2">
            <Input className="hidden w-64 md:block" placeholder="Search templates" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Workspace</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acme Cloud</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>API keys</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>New template</Button>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-semibold text-3xl tracking-normal">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Monitor notification delivery, template changes, and channel health from one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Export</Button>
            <Button variant="secondary">View logs</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <article className="rounded-lg border bg-card p-4" key={metric.label}>
              <p className="text-muted-foreground text-sm">{metric.label}</p>
              <p className="mt-2 font-semibold text-2xl">{metric.value}</p>
              <p className="mt-1 text-muted-foreground text-sm">{metric.detail}</p>
            </article>
          ))}
        </div>

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <div className="overflow-hidden rounded-lg border bg-card">
              {activity.map((item) => (
                <div
                  className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1fr_120px_120px_120px]"
                  key={`${item.event}-${item.time}`}
                >
                  <div>
                    <p className="font-medium">{item.event}</p>
                    <p className="text-muted-foreground text-sm">Production environment</p>
                  </div>
                  <p className="text-sm">{item.channel}</p>
                  <p className="text-muted-foreground text-sm">{item.time}</p>
                  <p className="font-medium text-sm">{item.status}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="grid gap-4 md:grid-cols-3">
              {["Welcome", "Billing", "Security"].map((template) => (
                <article className="rounded-lg border bg-card p-4" key={template}>
                  <p className="font-medium">{template}</p>
                  <p className="mt-2 text-muted-foreground text-sm">
                    Manage copy, variables, and channel-specific fallbacks.
                  </p>
                  <Button className="mt-4" variant="outline">
                    Open
                  </Button>
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels">
            <div className="rounded-lg border bg-card p-4">
              <p className="font-medium">Channel health</p>
              <p className="mt-2 text-muted-foreground text-sm">
                Email, SMS, push, and in-app notifications are ready for configuration.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
