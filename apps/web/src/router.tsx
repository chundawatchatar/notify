import { createRouter } from "@tanstack/react-router";

import { createAuthClient } from "./lib/auth";
import { createSignupVerificationClient } from "./lib/signup-verification";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    context: {
      auth: createAuthClient(),
      signupVerification: createSignupVerificationClient(),
    },
    routeTree,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
