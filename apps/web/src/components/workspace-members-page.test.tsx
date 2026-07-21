import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api-client";
import { defaultInviteRole, grantableRoles, memberActionError } from "./workspace-members-page";

describe("workspace member settings policy helpers", () => {
  it("offers only permitted roles and defaults to the least privileged one", () => {
    expect(grantableRoles("owner")).toEqual(["owner", "admin", "developer", "viewer"]);
    expect(grantableRoles("admin")).toEqual(["admin", "developer", "viewer"]);
    expect(grantableRoles("viewer")).toEqual([]);
    expect(defaultInviteRole(grantableRoles("owner"))).toBe("viewer");
    expect(defaultInviteRole(grantableRoles("admin"))).toBe("viewer");
    expect(defaultInviteRole([])).toBe("viewer");
  });

  it("explains last-owner protection", () => {
    expect(memberActionError(new ApiRequestError(409, "last_owner", "Conflict"))).toContain(
      "at least one active owner",
    );
  });
});
