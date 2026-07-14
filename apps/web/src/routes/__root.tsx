import { notifyLogoUrl } from "@notify/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth";
import type { RouterContext } from "@/lib/router-context";

import "@notify/styles/app.css";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: notifyLogoUrl,
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Notify",
      },
      {
        name: "description",
        content: "Notification operations dashboard for web products.",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { auth } = Route.useRouteContext();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={auth}>
          <Outlet />
        </AuthProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
