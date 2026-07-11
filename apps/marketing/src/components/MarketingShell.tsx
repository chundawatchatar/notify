import { Button, NotifyMarkIcon, Typography } from "@notify/ui";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

const webAppUrl = import.meta.env.PUBLIC_WEB_APP_URL ?? "http://localhost:3100";

const marketingUrls = {
  login: `${webAppUrl}/auth/login`,
  signup: `${webAppUrl}/auth/signup`,
};

const navItems = [
  { label: "Platform", href: "/#platform" },
  { label: "Architecture", href: "/#architecture" },
  { label: "Logs", href: "/#logs" },
  { label: "Pricing", href: "/pricing", page: "pricing" },
] as const;

function MarketingShell({
  activePage,
  children,
}: Readonly<{ activePage: "home" | "pricing"; children: ReactNode }>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <MarketingHeader activePage={activePage} />
      {children}
      <MarketingFooter />
    </main>
  );
}

function MarketingHeader({ activePage }: Readonly<{ activePage: "home" | "pricing" }>) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-6">
        <a className="flex items-center gap-2 font-semibold text-base" href="/">
          <span className="grid size-8 place-items-center rounded-sm border bg-foreground text-background">
            <NotifyMarkIcon className="size-4" />
          </span>
          Notify
        </a>

        <div className="hidden items-center gap-6 text-muted-foreground text-sm lg:flex">
          {navItems.map((item) => (
            <a
              className={
                "page" in item && item.page === activePage
                  ? "text-foreground"
                  : "transition-colors hover:text-foreground"
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex" variant="ghost">
            <a href={marketingUrls.login}>Sign in</a>
          </Button>
          <Button asChild>
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
    <footer className="border-t bg-secondary/25">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-6">
        <div>
          <a className="flex w-fit items-center gap-2 font-semibold" href="/">
            <span className="grid size-8 place-items-center rounded-sm border bg-foreground text-background">
              <NotifyMarkIcon className="size-4" />
            </span>
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
              ["Platform", "/#platform"],
              ["Architecture", "/#architecture"],
              ["Logs", "/#logs"],
            ]}
            title="Product"
          />
          <FooterGroup links={[["Pricing", "/pricing"]]} title="Company" />
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
