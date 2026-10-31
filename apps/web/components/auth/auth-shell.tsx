import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSelector } from "@/components/theme-selector";
import { clinicContact } from "@/lib/clinic-contact";
import { clinicLocation } from "@/lib/clinic-location";
import styles from "./auth.module.css";

const benefits = [
  { icon: CalendarDays, text: "Reserva y gestiona tus citas" },
  { icon: FileText, text: "Consulta tu historial clínico" },
  { icon: ShieldCheck, text: "Tu información en tu espacio de paciente" },
];

export function AuthShell({ children, variant = "login" }: {
  children: ReactNode;
  variant?: "login" | "register";
}) {
  const isRegister = variant === "register";

  return (
    <main className={styles.shell}>
      <aside className={styles.brandPanel} aria-labelledby="auth-intro-title">
        <Link href="/" className={styles.brand} aria-label="Biodentis, inicio">
          <BrandLogo />
          <span>ODONTOLOGÍA ESPECIALIZADA</span>
        </Link>

        <div className={styles.brandContent}>
          <span className={styles.eyebrow}>TU SALUD, MÁS CERCA.</span>
          <h2 id="auth-intro-title">{isRegister
            ? "Tu próxima sonrisa empieza con un primer paso."
            : "Citas e historial clínico de tu consultorio odontológico."}</h2>
          <p>{isRegister
            ? "Crea tu cuenta de paciente y comienza a organizar tu atención con nosotros."
            : "Un solo lugar para organizar tu atención y acompañarte en cada visita."}</p>
          <ul className={styles.benefits}>
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text}><span><Icon size={18} strokeWidth={1.7} /></span>{text}</li>
            ))}
          </ul>
        </div>

        <div className={styles.brandFooter}>
          <span>© {new Date().getFullYear()} BIODENTIS</span>
          <span>{clinicLocation.district}, {clinicLocation.region}</span>
        </div>
      </aside>

      <section className={styles.formPanel} aria-label={isRegister ? "Registro de pacientes" : "Acceso a BIODENTIS"}>
        <header className={styles.toolbar}>
          <Link href="/" className={styles.backLink}><ArrowLeft size={15} /><span>Volver al inicio</span></Link>
          <Link href="/" className={styles.mobileBrand} aria-label="Biodentis, inicio"><BrandLogo /></Link>
          <ThemeSelector />
        </header>
        <div className={styles.cardArea}>
          <div className={`${styles.card} ${isRegister ? styles.registerCard : ""}`}>{children}</div>
        </div>
        <footer className={styles.help}>
          <span>¿Necesitas ayuda?</span><a href={clinicContact.whatsapp} target="_blank" rel="noopener noreferrer">Escríbenos al {clinicContact.displayPhone}</a>
        </footer>
      </section>
    </main>
  );
}
