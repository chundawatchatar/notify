import { afterEach, describe, expect, it } from "vitest";

import { cleanup, render } from "../test/render";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./navigation-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Toaster } from "./sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

afterEach(cleanup);

describe("overlay components", () => {
  it("renders dialog content when controlled open", () => {
    expect.hasAssertions();

    render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Scoped backend ingest key.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button>Create key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    expect(document.body.querySelector('[data-slot="dialog-content"]')?.textContent).toContain(
      "Create API key",
    );
    expect(document.body.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
  });

  it("renders sheet content and close control when controlled open", () => {
    expect.hasAssertions();

    render(
      <Sheet open>
        <SheetTrigger>Open details</SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Event details</SheetTitle>
            <SheetDescription>invoice.paid delivery state.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Close sheet</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    const sheet = document.body.querySelector('[data-slot="sheet-content"]');

    expect(sheet?.textContent).toContain("Event details");
    expect(sheet?.classList.contains("left-0")).toBe(true);
    expect(document.body.querySelector('[data-slot="sheet-close"]')?.textContent).toContain(
      "Close",
    );
  });

  it("renders popover and hover card content when controlled open", () => {
    expect.hasAssertions();

    render(
      <div>
        <Popover open>
          <PopoverAnchor />
          <PopoverTrigger>Filters</PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Delivery filters</PopoverTitle>
              <PopoverDescription>Filter notification events.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        <HoverCard open>
          <HoverCardTrigger>Workspace</HoverCardTrigger>
          <HoverCardContent>Acme Cloud production workspace.</HoverCardContent>
        </HoverCard>
      </div>,
    );

    expect(document.body.querySelector('[data-slot="popover-content"]')?.textContent).toContain(
      "Delivery filters",
    );
    expect(document.body.querySelector('[data-slot="hover-card-content"]')?.textContent).toContain(
      "Acme Cloud",
    );
  });

  it("renders dropdown menu content and item variants when controlled open", () => {
    expect.hasAssertions();

    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Workspace</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Acme Cloud</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Settings
              <DropdownMenuShortcut>S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked>Delivery logs</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="prod">
            <DropdownMenuRadioItem value="prod">Production</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>API keys</DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(document.body.querySelector('[role="menu"]')?.textContent).toContain("Acme Cloud");
    expect(document.body.querySelector('[role="menuitemcheckbox"]')?.textContent).toContain(
      "Delivery logs",
    );
    expect(document.body.querySelector('[role="menuitemradio"]')?.textContent).toContain(
      "Production",
    );
  });

  it("renders tooltip content with provider defaults", () => {
    expect.hasAssertions();

    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Gateway status</TooltipTrigger>
          <TooltipContent>All realtime gateways are healthy.</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(document.body.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain(
      "healthy",
    );
  });

  it("renders navigation menu content and exposes trigger style", () => {
    expect.hasAssertions();

    const container = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/logs">Delivery logs</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
          <NavigationMenuViewport />
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(
      container.querySelector('[data-slot="navigation-menu"]')?.getAttribute("data-viewport"),
    ).toBe("false");
    expect(container.querySelector('[data-slot="navigation-menu-trigger"]')?.textContent).toContain(
      "Platform",
    );
    expect(navigationMenuTriggerStyle()).toContain("rounded-md");
  });

  it("renders toaster without requiring a custom theme provider", () => {
    expect.hasAssertions();

    const container = render(<Toaster />);

    expect(container.firstElementChild).not.toBeNull();
  });
});
