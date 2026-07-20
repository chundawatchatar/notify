import { isWorkspaceSection, type WorkspaceSectionId } from "./workspace-sections";

type ProductRedirect =
  | { kind: "dashboard"; workspaceSlug?: string }
  | { kind: "section"; section: WorkspaceSectionId; workspaceSlug?: string };

function productRedirectPath(pathname: string) {
  if (pathname === "/" || pathname === "/dashboard") {
    return pathname;
  }

  const legacySection = pathname.slice(1);

  if (isWorkspaceSection(legacySection)) {
    return pathname;
  }

  const match = pathname.match(
    /^\/w\/([^/]+)\/(dashboard|apps|ingress|analytics|subscription|security|settings)$/,
  );

  return match ? pathname : undefined;
}

function parseProductRedirect(pathname: string | undefined): ProductRedirect | undefined {
  if (!pathname || pathname === "/" || pathname === "/dashboard") {
    return pathname ? { kind: "dashboard" } : undefined;
  }

  const legacySection = pathname.slice(1);

  if (isWorkspaceSection(legacySection)) {
    return { kind: "section", section: legacySection };
  }

  const match = pathname.match(
    /^\/w\/([^/]+)\/(dashboard|apps|ingress|analytics|subscription|security|settings)$/,
  );

  if (!match) {
    return undefined;
  }

  const [, workspaceSlug, destination] = match;

  if (destination === "dashboard") {
    return { kind: "dashboard", workspaceSlug };
  }

  return isWorkspaceSection(destination)
    ? { kind: "section", section: destination, workspaceSlug }
    : undefined;
}

function resolveProductRedirect(
  pathname: string | undefined,
  activeWorkspaceSlug: string,
): ProductRedirect {
  const redirect = parseProductRedirect(pathname);

  if (!redirect || (redirect.workspaceSlug && redirect.workspaceSlug !== activeWorkspaceSlug)) {
    return { kind: "dashboard" };
  }

  return redirect;
}

export type { ProductRedirect };
export { parseProductRedirect, productRedirectPath, resolveProductRedirect };
