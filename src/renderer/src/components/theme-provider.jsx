import { ThemeProvider as NextThemesProvider } from "next-themes";
import { THEME_STORAGE_KEY } from "@renderer/lib/theme";

const ThemeProvider = ({ children }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
    storageKey={THEME_STORAGE_KEY}
  >
    {children}
  </NextThemesProvider>
);

export { ThemeProvider };
