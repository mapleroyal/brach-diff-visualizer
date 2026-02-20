import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });

  if (!window.PointerEvent) {
    Object.defineProperty(window, "PointerEvent", {
      writable: true,
      value: MouseEvent,
    });
  }

  if (!window.HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      writable: true,
      value: () => false,
    });
  }

  if (!window.HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      writable: true,
      value: () => {},
    });
  }

  if (!window.HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(
      window.HTMLElement.prototype,
      "releasePointerCapture",
      {
        writable: true,
        value: () => {},
      }
    );
  }

  if (!window.HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      writable: true,
      value: () => {},
    });
  }
}
