"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "@/components/theme-selector";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./landing.module.css";

const links = [["hero", "Inicio"], ["especialidades", "Especialidades"], ["servicios", "Servicios y precios"], ["equipo", "Equipo"], ["horarios", "Horarios"], ["contacto", "Contacto"]] as const;

export function LandingHeader({ name = "BIODENTIS" }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-15% 0px -45% 0px", threshold: [0, 0.2, 0.5] });
    links.forEach(([id]) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); document.getElementById("landing-menu-toggle")?.focus(); }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label={`${name}, inicio`}><BrandLogo name={name} /><small>ODONTOLOGÍA ESPECIALIZADA</small></Link>
        <nav className={styles.desktopNav} aria-label="Navegación principal">{links.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</nav>
        <div className={styles.headerActions}>
          <ThemeSelector />
          <Link href="/login" className={styles.loginLink}>Iniciar sesión</Link>
          <Link href="/register" className={styles.primaryButton}>Registrarse <ArrowUpRight size={15} /></Link>
          <button id="landing-menu-toggle" className={styles.menuToggle} type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && <nav id="landing-mobile-menu" className={styles.mobileNav} aria-label="Navegación móvil">{links.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={() => setOpen(false)}>{label}</a>)}<Link href="/login" onClick={() => setOpen(false)}>Iniciar sesión</Link><Link href="/register" onClick={() => setOpen(false)}>Crear mi cuenta</Link></nav>}
    </header>
  );
}
