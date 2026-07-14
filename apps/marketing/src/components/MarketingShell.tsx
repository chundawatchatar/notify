import { Button, NotifyLogoMark, Typography } from "@notify/ui";
import { ArrowRight, Menu, X } from "lucide-react";
import type { ReactNode } from "react";

const webAppUrl = import.meta.env.PUBLIC_WEB_APP_URL ?? "http://localhost:3100";

const marketingUrls = {
  login: `${webAppUrl}/auth/login`,
  signup: `${webAppUrl}/auth/signup`,
};

const navItems = [
  { label: "Platform", href: "/platform", page: "platform" },
  { label: "Developers", href: "/developers", page: "developers" },
  { label: "Security", href: "/security", page: "security" },
  { label: "Pricing", href: "/pricing", page: "pricing" },
] as const;

function MarketingShell({
  activePage,
  children,
}: Readonly<{
  activePage: "developers" | "home" | "platform" | "pricing" | "security";
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <MarketingHeader activePage={activePage} />
      {children}
      <MarketingFooter />
    </main>
  );
}

function MarketingHeader({
  activePage,
}: Readonly<{
  activePage: "developers" | "home" | "platform" | "pricing" | "security";
}>) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-6">
        <div className="flex items-center gap-2">
          <details className="group relative lg:hidden">
            <Button asChild size="icon" variant="ghost">
              <summary
                aria-label="Toggle navigation menu"
                className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              >
                <Menu className="group-open:hidden" />
                <X className="hidden group-open:block" />
              </summary>
            </Button>

            <div className="absolute top-full left-0 mt-3 w-[min(18rem,calc(100vw-2.5rem))] rounded-md border bg-background p-2 shadow-lg">
              {navItems.map((item) => (
                <a
                  aria-current={item.page === activePage ? "page" : undefined}
                  className={
                    item.page === activePage
                      ? "block rounded-md bg-secondary px-3 py-2 font-medium text-primary text-sm"
                      : "block rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-secondary hover:text-primary"
                  }
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 border-t pt-2 sm:hidden">
                <Button asChild className="w-full justify-start" size="sm" variant="ghost">
                  <a href={marketingUrls.login}>Sign in</a>
                </Button>
              </div>
            </div>
          </details>

          <a className="flex items-center gap-2 font-semibold text-base" href="/">
            <NotifyLogoMark />
            Notify
          </a>
        </div>

        <div className="hidden items-center gap-6 text-muted-foreground text-sm lg:flex">
          {navItems.map((item) => (
            <a
              aria-current={item.page === activePage ? "page" : undefined}
              className={
                item.page === activePage
                  ? "font-medium text-primary"
                  : "transition-colors hover:text-primary"
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
            <a href={marketingUrls.login}>Sign in</a>
          </Button>
          <Button asChild size="sm">
            <a href={marketingUrls.signup}>
              Get API key
              <ArrowRight />
            </a>
          </Button>
        </div>
      </nav>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-6">
        <div>
          <a className="flex w-fit items-center gap-2 font-semibold" href="/">
            <NotifyLogoMark />
            Notify
          </a>
          <Typography as="p" className="mt-3 max-w-md text-muted-foreground text-sm">
            Realtime notification infrastructure for client-facing apps, delivery logs, and
            subscription-aware workspaces.
          </Typography>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <FooterGroup
            links={[
              ["Platform", "/platform"],
              ["Developers", "/developers"],
              ["Security", "/security"],
              ["Pricing", "/pricing"],
            ]}
            title="Product"
          />
          <FooterGroup
            links={[
              ["Architecture", "/platform#architecture"],
              ["Delivery logs", "/platform#delivery-logs"],
              ["Ingress API", "/developers#ingress-api"],
            ]}
            title="Resources"
          />
          <FooterGroup
            links={[
              ["Sign in", marketingUrls.login],
              ["Get API key", marketingUrls.signup],
            ]}
            title="Account"
          />
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  links,
  title,
}: Readonly<{ links: Array<[label: string, href: string]>; title: string }>) {
  return (
    <div>
      <Typography as="p" className="font-medium text-sm">
        {title}
      </Typography>
      <div className="mt-3 grid gap-2">
        {links.map(([label, href]) => (
          <a className="text-muted-foreground hover:text-foreground" href={href} key={href}>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export { MarketingShell, marketingUrls };
