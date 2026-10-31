"use client";

import { useEffect, useState } from "react";
import { clinic } from "@/lib/landing-content";
import styles from "./landing.module.css";

export function OpeningStatus() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    function update() {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: clinic.timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
      const day = value("weekday");
      const minutes = Number(value("hour")) * 60 + Number(value("minute"));
      setOpen(day !== "Sun" && minutes >= (day === "Sat" ? 540 : 480) && minutes < (day === "Sat" ? 840 : 1080));
    }
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  return <span className={styles.pill}><span className={styles.statusDot} />{open === null ? "Horario de Lima" : open ? "Dentro del horario de atención" : "Fuera del horario de atención"}</span>;
}
