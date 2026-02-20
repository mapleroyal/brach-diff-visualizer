import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined") {
  const createStorageMock = () => {
    const store = new Map();

    return {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value));
      },
      removeItem: (key) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index) => Array.from(store.keys())[index] || null,
      get length() {
        return store.size;
      },
    };
  };

  if (
    !window.localStorage ||
    typeof window.localStorage.getItem !== "function" ||
    typeof window.localStorage.setItem !== "function" ||
    typeof window.localStorage.removeItem !== "function" ||
    typeof window.localStorage.clear !== "function"
  ) {
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: createStorageMock(),
    });
  }

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

  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
    });
  }
}
