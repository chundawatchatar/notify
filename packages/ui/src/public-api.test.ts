import { describe, expect, it } from "vitest";

import * as ui from "./index";

describe("public api", () => {
  it("exports component entry points and utilities", () => {
    expect.hasAssertions();

    expect(ui.Button).toBeTypeOf("function");
    expect(ui.Card).toBeTypeOf("function");
    expect(ui.Sheet).toBeTypeOf("function");
    expect(ui.NavigationMenu).toBeTypeOf("function");
    expect(ui.RadioGroup).toBeTypeOf("function");
    expect(ui.Toaster).toBeTypeOf("function");
    expect(ui.toast).toBeTypeOf("function");
    expect(ui.variantToElementMap.heading2).toBe("h2");
  });

  it("merges Tailwind classes with later utilities winning", () => {
    expect.hasAssertions();

    expect(ui.cn("px-2 text-sm", "px-4", false, "font-medium")).toBe("text-sm px-4 font-medium");
  });
});
