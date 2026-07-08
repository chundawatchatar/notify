import { Tabs, TabsContent, TabsList, TabsTrigger } from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs className="max-w-md" defaultValue="email">
      <TabsList>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="sms">SMS</TabsTrigger>
        <TabsTrigger value="push">Push</TabsTrigger>
      </TabsList>
      <TabsContent value="email">Email notification templates and delivery settings.</TabsContent>
      <TabsContent value="sms">
        SMS sender configuration and regional compliance options.
      </TabsContent>
      <TabsContent value="push">
        Push notification channels for browser and mobile clients.
      </TabsContent>
    </Tabs>
  ),
};
