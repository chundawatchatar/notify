import {
  Badge,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Overlays",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const EventDetailsSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open event details</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>invoice.paid</SheetTitle>
          <SheetDescription>Delivery details for a production notification event.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4">
          <div className="rounded-md border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Delivery state</p>
              <Badge variant="success">Delivered</Badge>
            </div>
            <p className="mt-2 text-muted-foreground text-sm">
              Routed to one active browser session in 82ms.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono">user_456</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Topic</span>
              <span className="font-mono">billing.receipts</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Environment</span>
              <span>Production</span>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline">View logs</Button>
          <Button>Replay event</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const DeliveryPopover: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Delivery filters</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Filter activity</PopoverTitle>
          <PopoverDescription>Show events by delivery state.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-4 grid gap-2">
          {["Delivered", "Queued", "Failed", "Throttled"].map((status) => (
            <Button className="justify-start" key={status} size="sm" variant="ghost">
              {status}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WorkspaceHoverCard: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">Acme Cloud workspace</Button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">Acme Cloud</p>
            <Badge variant="info">Production</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            28.4k active sessions across email, push, and in-app notification channels.
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="font-medium">99.7%</p>
              <p className="text-muted-foreground text-xs">Delivery</p>
            </div>
            <div>
              <p className="font-medium">94ms</p>
              <p className="text-muted-foreground text-xs">p95</p>
            </div>
            <div>
              <p className="font-medium">0</p>
              <p className="text-muted-foreground text-xs">Incidents</p>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
};
