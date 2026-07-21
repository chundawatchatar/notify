import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { InvitationAcceptancePage } from "@/components/invitation-acceptance-page";
import { PageLoader } from "@/components/page-loader";

const searchSchema = z.object({ token: z.string().min(1).optional().catch(undefined) });

export const Route = createFileRoute("/auth/invitations/accept")({
  beforeLoad: async ({ context, search }) => {
    if (search.token) {
      await context.invitationAcceptance.capture(search.token);
      throw redirect({ replace: true, search: {}, to: "/auth/invitations/accept" });
    }

    return { invitationAcceptanceState: context.invitationAcceptance.getState() };
  },
  component: InvitationAcceptanceRoute,
  pendingComponent: () => <PageLoader label="Checking your invitation." />,
  pendingMs: 0,
  ssr: false,
  validateSearch: searchSchema,
});

function InvitationAcceptanceRoute() {
  const { invitationAcceptance, invitationAcceptanceState } = Route.useRouteContext();
  return (
    <InvitationAcceptancePage
      onComplete={invitationAcceptance.clear}
      onRetry={() =>
        invitationAcceptance.capture(
          invitationAcceptanceState?.status === "retryable-error"
            ? invitationAcceptanceState.token
            : "",
        )
      }
      state={invitationAcceptanceState}
    />
  );
}
