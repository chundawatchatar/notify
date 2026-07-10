import { Typography } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Typography",
  component: Typography,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Scale: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-5">
      <Typography as="h1">Realtime notification infrastructure</Typography>
      <Typography as="p" variant="lead">
        A professional type scale for developer-facing pages, dashboards, and documentation.
      </Typography>
      <Typography as="h2">Runtime primitives</Typography>
      <Typography as="p">
        Use typography components for consistent text rhythm across apps without repeating utility
        classes.
      </Typography>
      <Typography as="h3">Delivery log</Typography>
      <Typography as="h4">Event metadata</Typography>
      <Typography as="div" variant="large">
        Large emphasis text
      </Typography>
      <Typography as="small">Small supporting label</Typography>
      <Typography as="p" variant="muted">
        Muted operational metadata
      </Typography>
      <Typography as="a" href="https://docs.notify.tld" target="_blank" rel="noreferrer">
        Documentation link
      </Typography>
    </div>
  ),
};

export const RichText: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Typography as="p" variant="proseP">
        Publish events with <Typography as="code">notify.events.publish()</Typography> and let the
        delivery plane route them to connected clients.
      </Typography>
      <Typography as="p" variant="proseP">
        Rich text paragraphs can opt into sibling spacing without affecting compact UI copy.
      </Typography>
      <Typography as="blockquote">
        Tenant-aware limits should be enforced before a realtime workload reaches the socket layer.
      </Typography>
      <Typography as="ul">
        <li>Scoped API keys</li>
        <li>Replay-safe event IDs</li>
        <li>Delivery logs for every message</li>
      </Typography>
    </div>
  ),
};
