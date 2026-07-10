import { afterEach, describe, expect, it } from "vitest";

import { cleanup, render } from "../test/render";
import { Typography } from "./typography";

afterEach(cleanup);

describe("Typography", () => {
  it("renders bodyMedium as a paragraph by default", () => {
    expect.hasAssertions();

    const container = render(<Typography>Default body</Typography>);
    const typography = container.firstElementChild;

    expect(typography?.tagName).toBe("P");
    expect(typography?.getAttribute("data-variant")).toBe("bodyMedium");
    expect(typography?.classList.contains("text-base")).toBe(true);
    expect(typography?.classList.contains("leading-6")).toBe(true);
  });

  it("renders the default element for a visual variant", () => {
    expect.hasAssertions();

    const container = render(<Typography variant="heading2">Runtime primitives</Typography>);
    const typography = container.firstElementChild;

    expect(typography?.tagName).toBe("H2");
    expect(typography?.getAttribute("data-variant")).toBe("heading2");
    expect(typography?.classList.contains("text-4xl")).toBe(true);
    expect(typography?.classList.contains("font-semibold")).toBe(true);
  });

  it("allows as to override the rendered element without changing the variant", () => {
    expect.hasAssertions();

    const container = render(
      <Typography as="p" variant="heading2">
        Looks like a heading
      </Typography>,
    );
    const typography = container.firstElementChild;

    expect(typography?.tagName).toBe("P");
    expect(typography?.getAttribute("data-variant")).toBe("heading2");
    expect(typography?.classList.contains("text-4xl")).toBe(true);
    expect(typography?.classList.contains("font-semibold")).toBe(true);
  });

  it("merges custom classes with variant classes", () => {
    expect.hasAssertions();

    const container = render(
      <Typography className="custom-type text-lg" variant="bodySmall">
        Custom body
      </Typography>,
    );
    const typography = container.firstElementChild;

    expect(typography?.classList.contains("custom-type")).toBe(true);
    expect(typography?.classList.contains("text-lg")).toBe(true);
    expect(typography?.classList.contains("text-sm")).toBe(false);
  });

  it("renders through Slot when asChild is true", () => {
    expect.hasAssertions();

    const container = render(
      <Typography asChild variant="heading2">
        <a href="/docs">Docs</a>
      </Typography>,
    );
    const typography = container.firstElementChild;

    expect(typography?.tagName).toBe("A");
    expect(typography?.getAttribute("href")).toBe("/docs");
    expect(typography?.getAttribute("data-variant")).toBe("heading2");
    expect(typography?.classList.contains("text-4xl")).toBe(true);
    expect(typography?.classList.contains("font-semibold")).toBe(true);
  });
});
