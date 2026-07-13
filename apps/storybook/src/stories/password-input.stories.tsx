import { PasswordInput } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Password Input",
  component: PasswordInput,
  tags: ["autodocs"],
  args: {
    "aria-label": "Password",
    placeholder: "Enter password",
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "correct-horse-battery-staple",
  },
};
