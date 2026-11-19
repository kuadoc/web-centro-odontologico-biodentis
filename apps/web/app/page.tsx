import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, CreditCard, Mail, MapPin, MessageCircle, Navigation, Phone, ScanLine, Search as SearchIcon, ShieldCheck, Smile, Users } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { OpeningStatus } from "@/components/landing/opening-status";
import { clinic as landingDefaults } from "@/lib/landing-content";
import { ClinicService } from "@/modules/clinic/clinic.service";
import { DentistCarousel } from "@/components/landing/dentist-carousel";
import { ServiceExplorer } from "@/components/landing/service-explorer";
import { BrandLogo } from "@/components/brand-logo";
import styles from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: "Biodentis | Odontología especializada para tu sonrisa",
  description: "Conoce Biodentis: odontología integral, diagnóstico digital y atención personalizada. Explora nuestras especialidades y agenda tu evaluación.",
  alternates: { canonical: "https://biodentis.com" },
  openGraph: { title: "BIODENTIS | Tu salud bucal, en buenas manos", description: "Odontología especializada. Precisión clínica y atención humana.", url: "https://biodentis.com", locale: "es_PE", type: "website", images: [{ url: "https://biodentis.com/images/plena_operacion.jpeg", width: 1600, height: 900, alt: "Atención odontológica" }] },
};

const booking = "/login?callbackUrl=%2Fappointments%3Fnew%3D1";
export default async function HomePage() {
  await connection();
  const clinic = await new ClinicService().getPublic();
  const clinicEmail = clinic.email || landingDefaults.email;
  const schema = {
    "@context": "https://schema.org", "@type": "Dentist", name: clinic.name, url: "https://biodentis.com", telephone: clinic.internationalPhone, email: clinicEmail,
    image: "https://biodentis.com/images/plena_operacion.jpeg",
    address: { "@type": "PostalAddress", streetAddress: clinic.address, addressCountry: "PE" },
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "18:00" }, { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" }],
  };

  return (
    <div className={styles.landing}>
      <a href="#contenido" className={styles.skipLink}>Saltar al contenido</a>
      <LandingHeader name={clinic.name} />
      <main id="contenido">
        <section id="hero" className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroEyebrow}><span className={styles.eyebrow}><span className={styles.statusDot} /> PRECISIÓN CLÍNICA. ATENCIÓN HUMANA.</span><span className={styles.locationLabel}><MapPin size={13} /> {clinic.name}</span></div>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <span className={styles.pill}><ShieldCheck size={13} /> Centro odontológico especializado</span>
                <h1>Tu salud bucal,<br /><span>en buenas manos.</span></h1>
                <p className={styles.heroLead}>La precisión de la tecnología.<br />La tranquilidad de sentirte cuidado.</p>
                <p className={styles.description}>En Biodentis combinamos diagnóstico digital y odontología especializada con algo esencial: escucharte. Cuidamos tu sonrisa con un plan pensado para ti, en cada etapa de tu vida.</p>
                <div className={styles.actions}><Link className={styles.primaryButton} href={booking}><CalendarDays size={16} /> Agenda tu evaluación <ArrowUpRight size={16} /></Link><a className={styles.secondaryButton} href="#servicios">Servicios y precios <ArrowDown size={15} /></a></div>
                <div className={styles.heroAssurance}><span><Check size={14} /> Diagnóstico personalizado</span><span><Check size={14} /> Presupuesto transparente</span></div>
              </div>
              <div className={styles.heroVisual}>
                <div className={styles.heroPhoto}>
                <Image src="/images/plena_operacion.jpeg" alt="Equipo odontológico atendiendo a una paciente en el sillón dental" fill preload sizes="(max-width: 767px) 100vw, 48vw" className={styles.heroImage} />
                <span className={styles.imageIndex}>BIODENTIS / CUIDADO DE PRECISIÓN</span>
                </div>
                <div className={styles.imageCaption}><span className={styles.captionIcon}><ScanLine size={22} /></span><div><strong>Una nueva forma de cuidar tu sonrisa</strong><small>DIAGNÓSTICO DIGITAL · PLANIFICACIÓN 3D</small></div><ArrowUpRight size={20} /></div>
              </div>
            </div>
            <div className={styles.trustStrip}>{[{ icon: Users, title: "Atención integral", text: "Para ti y tu familia" }, { icon: ScanLine, title: "Tecnología 3D CBCT", text: "Precisión en cada diagnóstico" }, { icon: ShieldCheck, title: "Seguridad clínica", text: "Cuidado en cada procedimiento" }, { icon: CreditCard, title: "Opciones de pago", text: "Consulta nuestros convenios" }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={21} strokeWidth={1.5} /><div><strong>{title}</strong><span>{text}</span></div></div>)}</div>
          </div>
        </section>

        <ServiceExplorer />

        <section id="primera-visita" className={styles.section} aria-labelledby="first-visit-title">
          <div className={`${styles.container} ${styles.visitLayout}`}>
            <div className={styles.visitIntro}><span className={styles.eyebrow}>03 / TU PRIMERA VISITA</span><h2 id="first-visit-title">Un primer paso.<br />Un plan pensado para ti.</h2><p>No necesitas conocer el nombre de un tratamiento para empezar. Te acompañamos desde la primera consulta.</p><Link href={booking} className={styles.textLink}>Quiero agendar mi evaluación <ArrowRight size={16} /></Link></div>
            <div className={styles.visitSteps}>
              {[{ icon: SearchIcon, title: "Explora y resuelve tus dudas", text: "Conoce nuestras especialidades, revisa los servicios y consulta sus precios antes de tu visita." }, { icon: CalendarDays, title: "Solicita tu evaluación", text: "Elige un horario disponible desde tu cuenta. Recepción te acompañará con la confirmación de tu atención." }, { icon: Smile, title: "Conoce tu plan de cuidado", text: "El profesional evaluará tu caso y te explicará las alternativas y el presupuesto antes de comenzar." }].map(({ icon: Icon, title, text }, index) => <article key={title} className={styles.visitStep}><span className={styles.visitStepNumber}>0{index + 1}</span><div><span className={styles.visitStepIcon}><Icon size={19} strokeWidth={1.5} /></span><h3>{title}</h3><p>{text}</p></div></article>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.subtleSection}`} id="equipo">
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>04 / NUESTRO EQUIPO</span><h2>El lado humano<br />de tu atención.</h2></div><p>Conoce a los profesionales de Biodentis, su formación y su especialidad. Un equipo que te escucha y te acompaña en cada visita.</p></div>
            <DentistCarousel />
          </div>
        </section>

        <section id="contacto" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>05 / NUESTRA CLÍNICA</span><h2>Un espacio para sentirte tranquilo.</h2></div><p>Instalaciones equipadas para tu atención en {clinic.name}. Estamos cerca para acompañarte en cada visita.</p></div>
            <div className={styles.contactGrid}>
              <a className={styles.map} href={clinic.maps} target="_blank" rel="noopener noreferrer" aria-label={`Ver la ubicación de ${clinic.name} en Google Maps`}><span className={styles.mapLabel}><MapPin size={18} /> {clinic.name}</span><span className={styles.mapPin}><MapPin size={44} strokeWidth={1.25} /><strong>Tu próxima visita, aquí.</strong><span>{clinic.address}</span></span><span className={styles.mapFooter}><span><Navigation size={15} /> Cómo llegar a la clínica</span><span>Abrir en Google Maps <ArrowUpRight size={15} /></span></span></a>
              <div className={styles.contactCard}><span className={styles.eyebrow}>{clinic.name}</span><h3>Te esperamos en {clinic.name}.</h3><p>Una atención cercana comienza desde el primer contacto.</p><div className={styles.contactDetails}><div><MapPin size={19} /><div><small>DIRECCIÓN</small><strong>{clinic.address}</strong></div></div><div><Phone size={19} /><div><small>CENTRAL TELEFÓNICA</small><a href={clinic.phoneHref}>{clinic.phone}</a></div></div><div><Mail size={19} /><div><small>CORREO ELECTRÓNICO</small><a href={`mailto:${clinicEmail}`}>{clinicEmail}</a></div></div></div><a className={styles.primaryButton} href={clinic.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Hablemos por WhatsApp <ArrowUpRight size={15} /></a></div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.subtleSection}`} id="horarios">
          <div className={`${styles.container} ${styles.hoursGrid}`}>
            <div><span className={styles.eyebrow}>06 / A TU TIEMPO</span><h2>Hagamos espacio<br />para tu salud.</h2><p className={styles.description}>Organiza tu visita y encuentra un horario que funcione para ti. Puedes consultar disponibilidad desde tu cuenta o escribirnos para recibir orientación.</p><Link className={styles.textLink} href={booking}>Consultar citas disponibles <ArrowRight size={16} /></Link></div>
            <div className={styles.hoursCard}><div className={styles.hoursHeader}><Clock3 size={20} /><h3>Horario de atención</h3></div><OpeningStatus /><dl className={styles.hoursTable}><div><dt>Lunes a viernes</dt><dd>{landingDefaults.weekdayHours}<small>Horario continuado</small></dd></div><div><dt>Sábados</dt><dd>{landingDefaults.saturdayHours}<small>Jornada de mañana</small></dd></div><div><dt>Domingos y festivos</dt><dd>Cerrado<small>Consultar coordinación previa</small></dd></div></dl><p className={styles.hoursNote}>Hora local de Lima. El indicador se calcula según el horario semanal; no contempla festivos ni cierres excepcionales.</p><div className={styles.urgentNote}><Phone size={17} /><p><strong>¿Necesitas atención urgente?</strong><br />Comunícate al <a href={clinic.phoneHref}>{clinic.phone}</a> para consultar disponibilidad.</p></div></div>
          </div>
        </section>

        <section className={styles.section} id="preguntas"><div className={`${styles.container} ${styles.faqGrid}`}><div><span className={styles.eyebrow}>ANTES DE TU VISITA</span><h2>Todo un poco más claro.</h2><p className={styles.description}>Resolvemos tus primeras dudas para que vengas con tranquilidad.</p></div><div className={styles.faqList}>{[{ q: "¿Cómo puedo agendar mi primera cita?", a: "Crea tu cuenta o inicia sesión y accede a la sección de citas para elegir tu atención. También puedes contactarnos por WhatsApp para consultar disponibilidad." }, { q: "¿Necesito saber qué tratamiento necesito?", a: "No. Puedes comenzar con una evaluación general. El equipo revisará tu salud bucal y te orientará sobre las alternativas de tratamiento según tus necesidades." }, { q: "¿Qué debo llevar a mi evaluación?", a: "Trae tu documento de identidad y, si tienes, radiografías o estudios anteriores. Comenta al profesional los medicamentos que utilizas y tus antecedentes de salud." }, { q: "¿Dónde puedo ver los precios de los servicios?", a: "En la sección Servicios y precios encontrarás los procedimientos disponibles, su especialidad y precio de lista en soles peruanos. El presupuesto final se define después de evaluar tu caso. Puedes consultar los detalles de cada servicio por WhatsApp." }, { q: "¿Puedo consultar formas de pago y convenios?", a: "Sí. Contacta a recepción para confirmar los convenios vigentes, las formas de pago y las condiciones aplicables antes de iniciar tu tratamiento." }].map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={17} /></summary><p>{a}</p></details>)}</div></div></section>

        <section className={styles.agenda} id="agenda"><div className={styles.container}><span className={styles.eyebrow}>EL PRIMER PASO ES MÁS SIMPLE DE LO QUE CREES</span><h2>Tu próxima sonrisa<br />comienza aquí.</h2><p>Agenda tu evaluación y conoce un plan de cuidado pensado para ti.<br />Te acompañamos desde el primer diagnóstico.</p><div className={styles.actions}><Link href={booking} className={styles.lightButton}><CalendarDays size={17} /> Agenda tu cita online <ArrowUpRight size={17} /></Link><a href={clinic.phoneHref} className={styles.darkOutlineButton}><Phone size={16} /> Llamar a la clínica</a></div><span className={styles.agendaRegister}>¿Es tu primera visita? <Link href="/register">Crea tu cuenta <ArrowRight size={13} /></Link></span></div></section>
      </main>
      <footer className={styles.footer}><div className={styles.container}><div className={styles.footerGrid}><div><Link href="/" className={styles.brand} aria-label={`${clinic.name}, inicio`}><BrandLogo name={clinic.name} /><small>ODONTOLOGÍA ESPECIALIZADA</small></Link><p>Precisión clínica, tecnología y un cuidado profundamente humano. Tu salud bucal, en buenas manos.</p></div><div><h3>Explora {clinic.name}</h3><a href="#especialidades">Nuestras especialidades</a><a href="#servicios">Servicios y precios</a><a href="#primera-visita">Tu primera visita</a><a href="#equipo">Nuestro equipo</a><a href="#contacto">Nuestra clínica</a><a href="#preguntas">Preguntas frecuentes</a></div><div><h3>Tu espacio de paciente</h3><Link href="/login">Iniciar sesión</Link><Link href="/register">Crear una cuenta</Link><Link href={booking}>Agendar una cita</Link><Link href="/forgot-password">Recuperar contraseña</Link></div><div><h3>Estamos cerca</h3><p>{clinic.name}<br />{clinic.address}</p><a href={clinic.phoneHref}>{clinic.phone}</a><a href={`mailto:${clinicEmail}`}>{clinicEmail}</a><a href={clinic.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={13} /></a></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} {clinic.name}. Todos los derechos reservados.</span><span>ODONTOLOGÍA CON PROPÓSITO.</span><a href="#hero">Volver al inicio ↑</a></div></div></footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    </div>
  );
}
