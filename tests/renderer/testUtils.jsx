import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "@renderer/App";
import { ThemeProvider } from "@renderer/components/theme-provider";

const renderApp = () =>
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

const setWindowApi = (api) => {
  if (!api || typeof api.pollAnalysis !== "function") {
    throw new Error(
      "window.api.pollAnalysis mock is required for renderer tests."
    );
  }

  Object.defineProperty(window, "api", {
    writable: true,
    value: api,
  });
};

const selectOption = async (label, option) => {
  const trigger = screen.getByRole("combobox", { name: label });

  await act(async () => {
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
  });

  const optionNode = await screen.findByRole("option", { name: option });

  await act(async () => {
    fireEvent.click(optionNode);
  });
};

export { renderApp, selectOption, setWindowApi };
