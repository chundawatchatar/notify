import { afterEach, describe, expect, it } from "vitest";

import { cleanup, click, render } from "../test/render";
import { Checkbox } from "./checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Switch } from "./switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

afterEach(cleanup);

describe("stateful components", () => {
  it("updates checkbox checked state on click", () => {
    expect.hasAssertions();

    const container = render(<Checkbox aria-label="Enable delivery logs" />);
    const checkbox = container.querySelector('[role="checkbox"]');

    expect(checkbox?.getAttribute("data-state")).toBe("unchecked");
    click(checkbox as Element);

    expect(checkbox?.getAttribute("data-state")).toBe("checked");
  });

  it("updates switch checked state on click", () => {
    expect.hasAssertions();

    const container = render(<Switch aria-label="Realtime fanout" size="sm" />);
    const switchControl = container.querySelector('[role="switch"]');

    expect(switchControl?.getAttribute("data-size")).toBe("sm");
    expect(switchControl?.getAttribute("data-state")).toBe("unchecked");
    click(switchControl as Element);

    expect(switchControl?.getAttribute("data-state")).toBe("checked");
  });

  it("renders tabs with the default active trigger", () => {
    expect.hasAssertions();

    const container = render(
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="activity">Recent delivery events</TabsContent>
        <TabsContent value="templates">Reusable notification copy</TabsContent>
      </Tabs>,
    );
    const activityTrigger = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (trigger) => trigger.textContent === "Activity",
    );

    expect(container.textContent).toContain("Recent delivery events");
    expect(activityTrigger?.getAttribute("data-state")).toBe("active");
  });

  it("updates radio group value through item clicks", () => {
    expect.hasAssertions();

    const container = render(
      <RadioGroup defaultValue="email">
        <RadioGroupItem aria-label="Email" value="email" />
        <RadioGroupItem aria-label="Push" value="push" />
      </RadioGroup>,
    );
    const [email, push] = Array.from(container.querySelectorAll('[role="radio"]'));

    expect(email?.getAttribute("data-state")).toBe("checked");
    click(push as Element);

    expect(push?.getAttribute("data-state")).toBe("checked");
    expect(email?.getAttribute("data-state")).toBe("unchecked");
  });

  it("renders select trigger and items when controlled open", () => {
    expect.hasAssertions();

    const container = render(
      <Select open value="us">
        <SelectTrigger aria-label="Region">
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="us">US</SelectItem>
          <SelectItem value="eu">EU</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(container.querySelector('[data-slot="select-trigger"]')?.textContent).toContain("US");
    expect(document.body.querySelector('[data-slot="select-content"]')?.textContent).toContain(
      "EU",
    );
  });

  it("toggles collapsible content through real trigger", () => {
    expect.hasAssertions();

    const container = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
        <CollapsibleContent>Delivery diagnostics</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = container.querySelector("button");

    expect(container.textContent).not.toContain("Delivery diagnostics");
    click(trigger as Element);

    expect(container.textContent).toContain("Delivery diagnostics");
  });
});
