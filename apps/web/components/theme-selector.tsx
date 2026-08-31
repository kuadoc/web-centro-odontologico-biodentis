"use client";

import { useTheme } from "next-themes";
import { Button } from "@workspace/ui/components/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const cycles = ["light", "dark", "system"] as const;
  const current = theme || "system";

  const cycle = () => {
    const idx = cycles.indexOf(current as typeof cycles[number]);
    setTheme(cycles[(idx + 1) % cycles.length] as string);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onPress={cycle}
      aria-label={`Tema actual: ${current}. Cambiar tema`}
    >
      {current === "light" && <Sun className="h-4 w-4" />}
      {current === "dark" && <Moon className="h-4 w-4" />}
      {current === "system" && <Monitor className="h-4 w-4" />}
    </Button>
  );
}
