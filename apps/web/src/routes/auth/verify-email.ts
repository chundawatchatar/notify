import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const verificationSearchSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/auth/verify-email")({
  beforeLoad: async ({ context, search }) => {
    if (search.token) {
      await context.signupVerification.exchange(search.token);
      throw redirect({ replace: true, search: {}, to: "/auth/verify-email" });
    }

    return { signupVerificationState: context.signupVerification.getState() };
  },
  pendingMs: 0,
  ssr: false,
  validateSearch: verificationSearchSchema,
});
