import { afterEach, describe, expect, it } from "vitest";

import { cleanup, click, render } from "../test/render";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "./avatar";
import { Badge } from "./badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { PasswordInput } from "./password-input";
import { Progress } from "./progress";
import { ScrollArea, ScrollBar } from "./scroll-area";
import { Separator } from "./separator";
import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Textarea } from "./textarea";

afterEach(cleanup);

describe("primitive components", () => {
  it("renders alert content with variant classes", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <Alert className="custom-alert" severity="error">
          <AlertTitle>Delivery failed</AlertTitle>
          <AlertDescription>Retry the webhook endpoint.</AlertDescription>
        </Alert>
        <Alert role="status" severity="success">
          <AlertTitle>Delivery restored</AlertTitle>
          <AlertDescription>Events are moving again.</AlertDescription>
        </Alert>
      </div>,
    );
    const alerts = container.querySelectorAll('[data-slot="alert"]');
    const alert = alerts[0];
    const success = alerts[1];

    expect(alert?.getAttribute("role")).toBe("alert");
    expect(alert?.getAttribute("data-severity")).toBe("error");
    expect(alert?.classList.contains("custom-alert")).toBe(true);
    expect(alert?.textContent).toContain("Delivery failed");
    expect(alert?.querySelector('[data-slot="alert-icon"]')).not.toBeNull();
    expect(success?.getAttribute("role")).toBe("status");
    expect(success?.getAttribute("aria-live")).toBe("polite");
    expect(success?.getAttribute("data-severity")).toBe("success");
    expect(container.querySelector('[data-slot="alert-description"]')?.textContent).toContain(
      "Retry",
    );
  });

  it("renders badge and button as slotted elements when requested", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <Badge asChild variant="success">
          <a href="/events">Delivered</a>
        </Badge>
        <Button asChild variant="outline">
          <a href="/templates">Open templates</a>
        </Button>
      </div>,
    );
    const links = container.querySelectorAll("a");

    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute("data-slot")).toBe("badge");
    expect(links[0]?.getAttribute("data-variant")).toBe("success");
    expect(links[1]?.classList.contains("border")).toBe(true);
  });

  it("renders card sections and optional shadow", () => {
    expect.hasAssertions();

    const container = render(
      <Card shadow="sm">
        <CardHeader>
          <CardTitle>Delivery plane</CardTitle>
          <CardDescription>Realtime health.</CardDescription>
          <CardAction>Live</CardAction>
        </CardHeader>
        <CardContent>99.7%</CardContent>
        <CardFooter>Open dashboard</CardFooter>
      </Card>,
    );
    const card = container.querySelector('[data-slot="card"]');

    expect(card?.classList.contains("shadow-sm")).toBe(true);
    expect(container.querySelector('[data-slot="card-title"]')?.textContent).toBe("Delivery plane");
    expect(container.querySelector('[data-slot="card-action"]')?.textContent).toBe("Live");
  });

  it("renders form primitives with forwarded attributes", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <Label htmlFor="workspace">Workspace</Label>
        <Input id="workspace" placeholder="Acme Cloud" type="text" />
        <Textarea aria-label="Notes" placeholder="Internal notes" />
      </div>,
    );

    expect(container.querySelector("label")?.getAttribute("for")).toBe("workspace");
    expect(container.querySelector("input")?.getAttribute("placeholder")).toBe("Acme Cloud");
    expect(container.querySelector("textarea")?.getAttribute("data-slot")).toBe("textarea");
  });

  it("shows and hides a password with an accessible toggle", () => {
    expect.hasAssertions();

    const container = render(<PasswordInput aria-label="Password" defaultValue="secret-value" />);
    const input = container.querySelector("input");
    const toggle = container.querySelector('button[aria-label="Show password"]');

    expect(input?.getAttribute("type")).toBe("password");
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");

    click(toggle as HTMLButtonElement);

    expect(input?.getAttribute("type")).toBe("text");
    expect(container.querySelector('button[aria-label="Hide password"]')).not.toBeNull();
  });

  it("renders table structure inside a responsive wrapper", () => {
    expect.hasAssertions();

    const container = render(
      <Table>
        <TableCaption>Recent notification events</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>invoice.paid</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 event</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(container.querySelector('[data-slot="table-container"]')).not.toBeNull();
    expect(container.querySelector("caption")?.textContent).toBe("Recent notification events");
    expect(container.querySelector("td")?.textContent).toBe("invoice.paid");
  });

  it("renders feedback and layout primitives", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <Separator orientation="vertical" />
        <Skeleton className="h-4" />
        <Progress value={64} />
        <ScrollArea className="h-20">
          <ScrollBar orientation="horizontal" />
          <p>Scrollable delivery log</p>
        </ScrollArea>
      </div>,
    );
    const progressIndicator = container.querySelector('[data-slot="progress-indicator"]');

    expect(
      container.querySelector('[data-slot="separator"]')?.getAttribute("data-orientation"),
    ).toBe("vertical");
    expect(container.querySelector('[data-slot="skeleton"]')?.classList.contains("h-4")).toBe(true);
    expect(progressIndicator?.getAttribute("style")).toContain("translateX(-36%)");
    expect(container.querySelector('[data-slot="scroll-area"]')?.textContent).toContain(
      "Scrollable",
    );
  });

  it("renders avatar and breadcrumb groups", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <AvatarGroup>
          <Avatar size="lg">
            <AvatarFallback>AM</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <AvatarGroupCount>+3</AvatarGroupCount>
        </AvatarGroup>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/workspaces">Acme Cloud</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Billing receipt</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>,
    );

    expect(container.querySelector('[data-slot="avatar"]')?.getAttribute("data-size")).toBe("lg");
    expect(container.querySelector('[data-slot="avatar-group-count"]')?.textContent).toBe("+3");
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("breadcrumb");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Billing receipt");
  });
});
