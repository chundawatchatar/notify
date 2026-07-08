import { Input } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "customer@example.com",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Email: Story = {
  args: {
    type: "email",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "billing@example.com",
  },
};
