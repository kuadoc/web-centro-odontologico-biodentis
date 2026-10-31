"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import styles from "./auth.module.css";

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "className">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordField}>
      <Input {...props} type={visible ? "text" : "password"} className={styles.passwordInput} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={styles.passwordToggle}
        onPress={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-controls={props.id}
        aria-pressed={visible}
        isDisabled={props.disabled}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </Button>
    </div>
  );
}
