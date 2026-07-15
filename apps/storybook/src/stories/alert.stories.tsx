import { Alert, AlertDescription, AlertTitle } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  component: Alert,
  parameters: {
    layout: "centered",
  },
  title: "Components/Alert",
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid w-[440px] gap-3">
      <Alert role="status" severity="success">
        <AlertTitle>Notification delivered</AlertTitle>
        <AlertDescription>invoice.paid reached user_456 in 82ms.</AlertDescription>
      </Alert>
      <Alert role="status" severity="info">
        <AlertTitle>New signing key</AlertTitle>
        <AlertDescription>
          Update production before the current signing key expires.
        </AlertDescription>
      </Alert>
      <Alert severity="warning">
        <AlertTitle>Ingress delayed</AlertTitle>
        <AlertDescription>Events are being retried and no data has been dropped.</AlertDescription>
      </Alert>
      <Alert severity="error">
        <AlertTitle>Delivery failed</AlertTitle>
        <AlertDescription>Check the endpoint response before retrying this event.</AlertDescription>
      </Alert>
    </div>
  ),
};
