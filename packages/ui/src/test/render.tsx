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

  act(() => {
    root.render(ui);
  });

  return container;
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function cleanup() {
  for (const root of roots.splice(0)) {
    act(() => {
      root.unmount();
    });
  }

  for (const container of containers.splice(0)) {
    container.remove();
  }
}

export { cleanup, click, render };
