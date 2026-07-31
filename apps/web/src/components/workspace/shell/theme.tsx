import { cn, Switch } from "@notify/ui";
import { useId, useLayoutEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function useWorkspaceTheme() {
  const [theme, setTheme] = useState<ThemeMode>(initialWorkspaceTheme);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function setThemeMode(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem("notify-theme", nextTheme);
  }

  return { setThemeMode, theme };
}

function initialWorkspaceTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("notify-theme");

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function WorkspaceThemeButton({
  className,
  label,
  onThemeChange,
  theme,
}: Readonly<{
  className?: string;
  label?: "full" | "short";
  onThemeChange: (theme: ThemeMode) => void;
  theme: ThemeMode;
}>) {
  const switchId = useId();

  const nextThemeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  const isDark = theme === "dark";
  const visibleLabel = isDark ? "Dark mode" : "Light mode";
  const shortLabel = isDark ? "Dark" : "Light";

  return (
    <div
      className={cn(
        "h-9 items-center gap-2 rounded-full border border-border/70 bg-background px-3 shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/30 hover:bg-secondary/60 hover:shadow-md",
        className,
      )}
    >
      <Switch
        aria-label={nextThemeLabel}
        checked={isDark}
        id={switchId}
        onCheckedChange={(checked) => onThemeChange(checked ? "dark" : "light")}
      />
      <label className="cursor-pointer font-medium text-sm" htmlFor={switchId}>
        {label === "full" ? visibleLabel : shortLabel}
      </label>
    </div>
  );
}

export type { ThemeMode };
export { useWorkspaceTheme, WorkspaceThemeButton };
