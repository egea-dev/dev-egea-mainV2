import { createContext, useContext, useEffect, useState } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: "system" | "light" | "dark" | "egea" | "next-blue" | "haxther";
  storageKey?: string;
};

type ThemeProviderState = {
  theme: "system" | "light" | "dark" | "egea" | "next-blue" | "haxther";
  setTheme: (theme: "system" | "light" | "dark" | "egea" | "next-blue" | "haxther") => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<"system" | "light" | "dark" | "egea" | "next-blue" | "haxther">(() => {
    const storedTheme = localStorage.getItem(storageKey);
    return (storedTheme as "system" | "light" | "dark" | "egea" | "next-blue" | "haxther") || defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const systemMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const mobileMedia = window.matchMedia("(max-width: 768px)");

    const applyTheme = () => {
      root.classList.remove("light", "dark", "egea", "next-blue", "haxther");
      const resolvedSystem = systemMedia.matches ? "dark" : "light";
      let resolvedTheme = theme === "system" ? resolvedSystem : theme;

      root.classList.add(resolvedTheme);
    };

    applyTheme();

    const handleChange = () => applyTheme();
    if (systemMedia.addEventListener) {
      systemMedia.addEventListener("change", handleChange);
      mobileMedia.addEventListener("change", handleChange);
    } else {
      systemMedia.addListener(handleChange);
      mobileMedia.addListener(handleChange);
    }

    return () => {
      if (systemMedia.removeEventListener) {
        systemMedia.removeEventListener("change", handleChange);
        mobileMedia.removeEventListener("change", handleChange);
      } else {
        systemMedia.removeListener(handleChange);
        mobileMedia.removeListener(handleChange);
      }
    };
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: "system" | "light" | "dark" | "egea") => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
