declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverPolyfill;

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }),
  writable: true,
});

export {};
