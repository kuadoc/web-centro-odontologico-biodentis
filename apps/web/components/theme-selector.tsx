"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button } from "@workspace/ui/components/button";
import { Sun, Moon, Monitor } from "lucide-react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const cycles = ["light", "dark", "system"] as const;
  // La preferencia guardada solo se refleja después de hidratar el HTML del servidor.
  const current = mounted ? theme || "system" : "system";
  const themeLabel = current === "light" ? "claro" : current === "dark" ? "oscuro" : "del sistema";

  const cycle = () => {
    const idx = cycles.indexOf(current as typeof cycles[number]);
    setTheme(cycles[(idx + 1) % cycles.length] as string);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onPress={cycle}
      isDisabled={!mounted}
      aria-label={`Tema actual: ${themeLabel}. Cambiar tema`}
    >
      {current === "light" && <Sun className="h-4 w-4" />}
      {current === "dark" && <Moon className="h-4 w-4" />}
      {current === "system" && <Monitor className="h-4 w-4" />}
    </Button>
  );
}
