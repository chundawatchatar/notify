import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi } from "vitest";

const roots: Root[] = [];
const containers: HTMLDivElement[] = [];
const originalLocksDescriptor = Object.getOwnPropertyDescriptor(navigator, "locks");
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalScrollToDescriptor = Object.getOwnPropertyDescriptor(window, "scrollTo");
const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView",
);

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

function buttonByLabel(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.getAttribute("aria-label") === label,
  );

  if (!button) {
    throw new Error(`Expected button with aria-label ${label}.`);
  }

  return button;
}

function buttonByText(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!button) {
    throw new Error(`Expected ${text} button.`);
  }

  return button;
}

function textMatch(container: HTMLElement, text: string) {
  const match = [...container.querySelectorAll("*")].find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!match) {
    throw new Error(`Expected text: ${text}`);
  }

  return match as HTMLElement;
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

function installBrowserCoordination({
  includeScrollMocks = false,
}: Readonly<{ includeScrollMocks?: boolean }> = {}) {
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: async <Result,>(_name: string, callback: () => Promise<Result>) => callback(),
    },
  });

  if (includeScrollMocks) {
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  }

  class BroadcastChannelMock {
    onmessage: ((event: MessageEvent) => void) | null = null;
    close() {}
    postMessage() {}
  }

  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);
}

function restoreBrowserCoordination() {
  if (originalLocksDescriptor) {
    Object.defineProperty(navigator, "locks", originalLocksDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "locks");
  }

  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }

  if (originalScrollToDescriptor) {
    Object.defineProperty(window, "scrollTo", originalScrollToDescriptor);
  }

  if (originalScrollIntoViewDescriptor) {
    Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoViewDescriptor);
  }

  vi.unstubAllGlobals();
}

function authResponse(role: "owner" | "viewer" = "owner") {
  return {
    access_token: "access-token",
    expires_in: 900,
    role,
    token_type: "Bearer",
    user: { email: "owner@example.com", id: "3dc20706-9944-4743-8121-c0429c622c0b" },
    workspace: {
      id: "7ad7137b-d5a5-4411-9993-463c7f7e71f4",
      name: "Acme Cloud",
      slug: "acme-cloud",
    },
  };
}

export {
  authResponse,
  blur,
  buttonByLabel,
  buttonByText,
  change,
  cleanup,
  click,
  installBrowserCoordination,
  render,
  restoreBrowserCoordination,
  textMatch,
  waitFor,
  waitForText,
};
