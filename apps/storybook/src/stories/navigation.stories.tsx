import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  ScrollArea,
} from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const activity = [
  ["invoice.paid", "Delivered", "82ms"],
  ["trial.expiring", "Queued", "118ms"],
  ["security.alert", "Streaming", "43ms"],
  ["workspace.invite", "Delivered", "76ms"],
  ["usage.limit", "Throttled", "132ms"],
  ["deploy.completed", "Delivered", "61ms"],
  ["report.ready", "Queued", "104ms"],
];

const meta = {
  title: "Components/Navigation",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const BreadcrumbTrail: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Acme Cloud</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Notification templates</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Billing receipt</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

export const WorkspaceMenu: Story = {
  render: () => (
    <NavigationMenu viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[360px] gap-2 p-2">
              <NavigationMenuLink href="#">
                <span className="font-medium">Delivery activity</span>
                <span className="text-muted-foreground text-sm">
                  Review recent notification state changes.
                </span>
              </NavigationMenuLink>
              <NavigationMenuLink href="#">
                <span className="font-medium">Channel settings</span>
                <span className="text-muted-foreground text-sm">
                  Configure email, SMS, push, and in-app delivery.
                </span>
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="px-4 py-2" href="#">
            API keys
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="px-4 py-2" href="#">
            Logs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

export const CollapsibleActivity: Story = {
  render: () => (
    <div className="w-[360px] rounded-md border bg-card">
      <Collapsible defaultOpen>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-medium text-sm">Realtime activity</p>
            <p className="text-muted-foreground text-xs">Last seven events</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="outline">
              Toggle
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ScrollArea className="h-64">
            <div className="grid gap-0">
              {activity.map(([event, status, latency]) => (
                <div className="grid gap-1 border-b px-4 py-3 last:border-b-0" key={event}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-sm">{event}</p>
                    <Badge variant={status === "Delivered" ? "success" : "secondary"}>
                      {status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">Latency {latency}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ),
};
