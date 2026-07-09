import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Delivery plane</CardTitle>
        <CardDescription>Realtime health for connected notification clients.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Socket sessions</span>
            <span className="font-medium">28.4k</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">P95 fanout</span>
            <span className="font-medium">94ms</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Open dashboard</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithShadow: Story = {
  render: () => (
    <Card className="w-80" shadow="sm">
      <CardHeader>
        <CardTitle>Optional shadow</CardTitle>
        <CardDescription>
          Cards are flat by default and can opt into a small shadow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Use this sparingly for overlays or elevated surfaces.
        </p>
      </CardContent>
    </Card>
  ),
};
