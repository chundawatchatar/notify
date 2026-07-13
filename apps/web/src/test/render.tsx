import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const roots: Root[] = [];
const containers: HTMLDivElement[] = [];

function render(ui: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);
  roots.push(root);
  containers.push(container);

  act(() => root.render(ui));
  return container;
}

function change(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function blur(element: HTMLElement) {
  act(() => element.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
}

function click(element: HTMLElement) {
  act(() => element.click());
}

async function waitForText(container: HTMLElement, text: string) {
  await waitFor(() => container.textContent?.includes(text) === true, `text: ${text}`);
}

async function waitFor(predicate: () => boolean, description = "condition") {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  throw new Error(`Timed out waiting for ${description}`);
}

function cleanup() {
  for (const root of roots.splice(0)) {
    act(() => root.unmount());
  }

  for (const container of containers.splice(0)) {
    container.remove();
  }
}

export { blur, change, cleanup, click, render, waitFor, waitForText };
