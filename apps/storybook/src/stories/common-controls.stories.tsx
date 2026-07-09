import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@notify/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Common Controls",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormControls: Story = {
  render: () => (
    <div className="grid w-[420px] gap-5">
      <div className="grid gap-2">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input id="workspace-name" placeholder="Acme Cloud" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workspace-notes">Notes</Label>
        <Textarea id="workspace-notes" placeholder="Internal setup notes" />
      </div>

      <div className="grid gap-3">
        <Label>Default region</Label>
        <Select defaultValue="us">
          <SelectTrigger>
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="us">US</SelectItem>
            <SelectItem value="eu">EU</SelectItem>
            <SelectItem value="apac">APAC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="delivery-logs">Delivery logs</Label>
        <Switch id="delivery-logs" defaultChecked />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="rate-limits" defaultChecked />
        <Label htmlFor="rate-limits">Enable tenant rate limits</Label>
      </div>
    </div>
  ),
};

export const FeedbackAndLoading: Story = {
  render: () => (
    <div className="grid w-[420px] gap-5">
      <Alert>
        <AlertTitle>Delivery queue is healthy</AlertTitle>
        <AlertDescription>
          All realtime gateways are accepting new socket sessions.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3">
        <Skeleton className="h-4 w-[260px]" />
        <Skeleton className="h-4 w-[320px]" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  ),
};

export const OverlaysAndData: Story = {
  render: () => (
    <TooltipProvider>
      <div className="grid w-[560px] gap-5">
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Generate a scoped key for backend notification ingest.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button>Create key</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Gateway status</Button>
            </TooltipTrigger>
            <TooltipContent>All realtime gateways are healthy.</TooltipContent>
          </Tooltip>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>invoice.paid</TableCell>
              <TableCell>Delivered</TableCell>
              <TableCell>82ms</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>trial.expiring</TableCell>
              <TableCell>Queued</TableCell>
              <TableCell>118ms</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  ),
};
