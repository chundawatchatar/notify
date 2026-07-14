import { afterEach, describe, expect, it } from "vitest";

import { cleanup, render } from "../test/render";
import {
  AppShell,
  AppShellBrand,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderInner,
  AppShellLayout,
  AppShellMain,
  AppShellNav,
  AppShellSidebar,
  AppShellSidebarFooter,
} from "./app-shell";
import { SidebarNavItem, SidebarNavLabel, StatCard, StatusLine, UsageBar } from "./dashboard";
import { GoogleMarkIcon, NotifyLogoMark } from "./icons";

afterEach(cleanup);

describe("dashboard UI components", () => {
  it("renders app shell sections with collapse state", () => {
    expect.hasAssertions();

    const container = render(
      <AppShell>
        <AppShellLayout collapsed>
          <AppShellSidebar collapsed expanded>
            <AppShellBrand>Notify</AppShellBrand>
            <AppShellNav>Navigation</AppShellNav>
            <AppShellSidebarFooter>Sign out</AppShellSidebarFooter>
          </AppShellSidebar>
          <AppShellMain>
            <AppShellHeader>
              <AppShellHeaderInner>Search</AppShellHeaderInner>
            </AppShellHeader>
            <AppShellContent>Dashboard content</AppShellContent>
          </AppShellMain>
        </AppShellLayout>
      </AppShell>,
    );

    expect(container.querySelector('[data-slot="app-shell"]')?.tagName).toBe("MAIN");
    expect(
      container.querySelector('[data-slot="app-shell-layout"]')?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(
      container.querySelector('[data-slot="app-shell-sidebar"]')?.getAttribute("data-collapsed"),
    ).toBe("true");
    expect(
      container.querySelector('[data-slot="app-shell-sidebar"]')?.getAttribute("data-expanded"),
    ).toBe("true");
    expect(
      container.querySelector('[data-slot="app-shell-header"]')?.classList.contains("border-b"),
    ).toBe(false);
    expect(container.querySelector('[data-slot="app-shell-content"]')?.textContent).toBe(
      "Dashboard content",
    );
  });

  it("renders sidebar nav item states and labels", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <SidebarNavItem active asChild collapsed>
          <a href="/dashboard" aria-label="Dashboard">
            <span aria-hidden="true">Icon</span>
            <SidebarNavLabel>Dashboard</SidebarNavLabel>
          </a>
        </SidebarNavItem>
        <SidebarNavItem href="/analytics">
          <SidebarNavLabel>Analytics</SidebarNavLabel>
        </SidebarNavItem>
      </div>,
    );
    const [activeLink, defaultLink] = Array.from(
      container.querySelectorAll('[data-slot="sidebar-nav-item"]'),
    );

    expect(activeLink?.tagName).toBe("A");
    expect(activeLink?.getAttribute("data-active")).toBe("true");
    expect(activeLink?.getAttribute("data-collapsed")).toBe("true");
    expect(activeLink?.getAttribute("aria-label")).toBe("Dashboard");
    expect(defaultLink?.getAttribute("data-active")).toBe("false");
    expect(container.querySelectorAll('[data-slot="sidebar-nav-label"]')).toHaveLength(2);
  });

  it("renders dashboard metric and status helpers", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <StatCard>
          <p>Delivered today</p>
          <strong>48,214</strong>
        </StatCard>
        <StatusLine label="Realtime fanout" value="Healthy" />
        <UsageBar label="Events" value={68} detail="682k of 1M monthly events" />
      </div>,
    );

    expect(container.querySelector('[data-slot="stat-card"]')?.textContent).toContain("Delivered");
    expect(container.querySelector('[data-slot="status-line"]')?.textContent).toContain("Healthy");
    expect(container.querySelector('[data-slot="usage-bar"]')?.textContent).toContain("68%");
    expect(
      container.querySelector('[data-slot="progress-indicator"]')?.getAttribute("style"),
    ).toContain("translateX(-32%)");
  });

  it("renders the custom brand marks", () => {
    expect.hasAssertions();

    const container = render(
      <div>
        <GoogleMarkIcon className="google-mark" />
        <NotifyLogoMark className="notify-mark" />
      </div>,
    );
    const googleMark = container.querySelector("svg");
    const notifyMark = container.querySelector("img");

    expect(googleMark?.getAttribute("aria-hidden")).toBe("true");
    expect(googleMark?.classList.contains("google-mark")).toBe(true);
    expect(notifyMark?.getAttribute("alt")).toBe("");
    expect(notifyMark?.classList.contains("notify-mark")).toBe(true);
  });
});
