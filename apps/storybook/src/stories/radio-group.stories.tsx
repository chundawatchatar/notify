import { Label, RadioGroup, RadioGroupItem } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const deliveryChannels = [
  {
    description: "Send updates through transactional email.",
    label: "Email",
    value: "email",
  },
  {
    description: "Route to browser and mobile push sessions.",
    label: "Push",
    value: "push",
  },
  {
    description: "Show realtime notifications inside the product.",
    label: "In-app",
    value: "in-app",
  },
];

export const DeliveryChannel: Story = {
  render: () => (
    <RadioGroup className="w-[420px]" defaultValue="in-app">
      {deliveryChannels.map((channel) => (
        <Label
          className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-4 hover:bg-accent"
          htmlFor={channel.value}
          key={channel.value}
        >
          <RadioGroupItem className="mt-1" id={channel.value} value={channel.value} />
          <span className="grid gap-1">
            <span className="font-medium">{channel.label}</span>
            <span className="text-muted-foreground text-sm">{channel.description}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  ),
};

export const DeliveryRegion: Story = {
  render: () => (
    <div className="grid w-[360px] gap-3">
      <div>
        <p className="font-medium">Default delivery region</p>
        <p className="text-muted-foreground text-sm">
          Choose where new workspaces are provisioned.
        </p>
      </div>
      <RadioGroup defaultValue="us">
        <div className="flex items-center gap-2">
          <RadioGroupItem id="us" value="us" />
          <Label htmlFor="us">United States</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id="eu" value="eu" />
          <Label htmlFor="eu">Europe</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id="apac" value="apac" />
          <Label htmlFor="apac">Asia Pacific</Label>
        </div>
      </RadioGroup>
    </div>
  ),
};
