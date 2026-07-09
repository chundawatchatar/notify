import { Badge } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: {
    children: "Realtime",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = {
  args: {
    children: "Delivered",
    variant: "success",
  },
};

export const Warning: Story = {
  args: {
    children: "Queued",
    variant: "warning",
  },
};

export const Info: Story = {
  args: {
    children: "Streaming",
    variant: "info",
  },
};
