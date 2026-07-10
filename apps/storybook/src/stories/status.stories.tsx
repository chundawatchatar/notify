import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  Button,
  Progress,
  Toaster,
  toast,
} from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Status",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TeamPresence: Story = {
  render: () => (
    <div className="grid w-[360px] gap-4 rounded-md border bg-card p-5">
      <div>
        <p className="font-medium">Workspace operators</p>
        <p className="text-muted-foreground text-sm">People currently watching delivery health.</p>
      </div>
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>AM</AvatarFallback>
          <AvatarBadge />
        </Avatar>
        <Avatar>
          <AvatarFallback>JR</AvatarFallback>
          <AvatarBadge className="bg-emerald-500" />
        </Avatar>
        <Avatar>
          <AvatarFallback>SK</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+4</AvatarGroupCount>
      </AvatarGroup>
    </div>
  ),
};

export const DeliveryProgress: Story = {
  render: () => (
    <div className="grid w-[420px] gap-4 rounded-md border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">Bulk notification publish</p>
          <p className="text-muted-foreground text-sm">18,240 of 24,000 recipients processed.</p>
        </div>
        <p className="font-mono text-sm">76%</p>
      </div>
      <Progress value={76} />
    </div>
  ),
};

export const ToastNotification: Story = {
  render: () => (
    <div className="grid w-[360px] gap-4 rounded-md border bg-card p-5">
      <Toaster />
      <div>
        <p className="font-medium">Delivery toast</p>
        <p className="text-muted-foreground text-sm">
          Use sonner for lightweight product feedback.
        </p>
      </div>
      <Button
        onClick={() => {
          toast.success("Notification delivered", {
            description: "invoice.paid reached user_456 in 82ms.",
          });
        }}
      >
        Show toast
      </Button>
    </div>
  ),
};
