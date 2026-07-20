import { describe, expect, it } from "vitest";
import {
  parseProductRedirect,
  productRedirectPath,
  resolveProductRedirect,
} from "./workspace-paths";

describe("workspace product paths", () => {
  it("preserves a canonical deep link for the active workspace", () => {
    expect(productRedirectPath("/w/acme-cloud/apps")).toBe("/w/acme-cloud/apps");
    expect(resolveProductRedirect("/w/acme-cloud/apps", "acme-cloud")).toEqual({
      kind: "section",
      section: "apps",
      workspaceSlug: "acme-cloud",
    });
  });

  it("fails closed to the active dashboard for malformed or stale redirects", () => {
    expect(parseProductRedirect("/w/acme-cloud/unknown")).toBeUndefined();
    expect(resolveProductRedirect("/w/other-workspace/apps", "acme-cloud")).toEqual({
      kind: "dashboard",
    });
  });

  it("maps transitional product aliases to their canonical destinations", () => {
    expect(resolveProductRedirect("/dashboard", "acme-cloud")).toEqual({ kind: "dashboard" });
    expect(resolveProductRedirect("/settings", "acme-cloud")).toEqual({
      kind: "section",
      section: "settings",
    });
  });
});
