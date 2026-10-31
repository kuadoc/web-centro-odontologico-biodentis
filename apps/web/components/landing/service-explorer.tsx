"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicServiceCatalog } from "@biodentis/shared-types";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Cross, HeartHandshake,
  Layers3, MessageCircle, Microscope, Ruler, ScanLine, Search, ShieldCheck,
  Smile, Sparkles, X,
} from "lucide-react";
import { clinic, specialties } from "@/lib/landing-content";
import styles from "./landing.module.css";

const icons = {
  tooth: Smile, ruler: Ruler, healing: Microscope, medical: Cross,
  shield: ShieldCheck, child: HeartHandshake, scan: ScanLine,
  sparkles: Sparkles, layers: Layers3,
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ServiceExplorer() {
  const [specialty, setSpecialty] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const { data, isPending, isError, refetch } = useQuery<PublicServiceCatalog>({
    queryKey: ["public-services"],
    queryFn: async () => {
      const response = await fetch("/api/public/services", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar los servicios");
      return response.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const allServices = data?.services ?? [];
  const specialtyNames = [...new Set([
    ...specialties.map((item) => item.name),
    ...allServices.map((item) => item.specialty),
  ])];
  const term = normalize(search.trim());
  const visible = allServices.filter((item) =>
    (!specialty || item.specialty === specialty)
    && (!term || normalize(`${item.name} ${item.specialty} ${item.category} ${item.description ?? ""}`).includes(term)),
  ).sort((a, b) => sort === "price"
    ? (a.price ?? Infinity) - (b.price ?? Infinity) || a.name.localeCompare(b.name, "es")
    : a.name.localeCompare(b.name, "es"));

  const formatPrice = (price: number) => new Intl.NumberFormat("es-PE", {
    style: "currency", currency: data?.currency ?? "PEN", minimumFractionDigits: 2,
  }).format(price);

  const selectSpecialty = (name: string) => {
    setSpecialty(name);
    setSearch("");
    document.getElementById("servicios")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  const clearFilters = () => { setSpecialty(""); setSearch(""); };

  return <>
    <section id="especialidades" className={styles.section} aria-labelledby="specialties-title">
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>01 / NUESTRAS ESPECIALIDADES</span><h2 id="specialties-title">Diferentes especialidades.<br />Un mismo cuidado por ti.</h2></div>
          <p>Cada sonrisa necesita una atención distinta. Explora nuestras áreas y descubre los servicios de cada especialidad.</p>
        </div>
        <div className={styles.specialtiesGrid}>
          {specialties.map((item, index) => {
            const Icon = icons[item.icon];
            return <button key={item.name} type="button" className={styles.specialtyCard}
              aria-label={`Ver servicios de ${item.name}`} aria-pressed={specialty === item.name}
              onClick={() => selectSpecialty(item.name)}>
              <span className={styles.specialtyCardTop}><span className={styles.iconBox}><Icon size={22} strokeWidth={1.5} /></span><span className={styles.specialtyNumber}>{String(index + 1).padStart(2, "0")}</span></span>
              <strong>{item.name}</strong><span className={styles.specialtyCategory}>{item.category}</span>
              <span className={styles.specialtyAction}>Explorar servicios <ArrowDown size={14} /></span>
            </button>;
          })}
        </div>
      </div>
    </section>

    <section id="servicios" className={`${styles.section} ${styles.catalogSection}`} aria-labelledby="services-title">
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>02 / SERVICIOS Y PRECIOS</span><h2 id="services-title">Tu cuidado, con las<br />cuentas claras.</h2></div>
          <p>Conoce los procedimientos, su especialidad y el precio de lista. Elige por dónde empezar; el plan final lo definimos contigo en tu evaluación.</p>
        </div>

        <div className={styles.catalogToolbar}>
          <label className={styles.catalogSearch}><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar servicios</span><input type="search" placeholder="¿Qué servicio estás buscando?" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch("")}><X size={16} /></button>}</label>
          <label className={styles.catalogSort}><span>Ordenar por</span><select aria-label="Ordenar servicios" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Nombre del servicio</option><option value="price">Menor precio</option></select></label>
        </div>

        <div className={styles.catalogFilters} role="group" aria-label="Filtrar servicios por especialidad">
          <button type="button" aria-pressed={!specialty} onClick={() => setSpecialty("")}>Todas las especialidades</button>
          {specialtyNames.map((name) => <button key={name} type="button" aria-pressed={specialty === name} onClick={() => setSpecialty(name)}>{name}</button>)}
        </div>

        <div className={styles.catalogResults} role="status" aria-live="polite" aria-atomic="true">
          <span>{isPending ? "Estamos preparando el catálogo para ti…" : isError ? "Catálogo no disponible temporalmente" : `${visible.length} ${visible.length === 1 ? "servicio disponible" : "servicios disponibles"}${specialty ? ` · ${specialty}` : ""}`}</span>
          {(specialty || search) && <button type="button" onClick={clearFilters}>Limpiar filtros <X size={13} /></button>}
        </div>

        {isPending ? <div className={styles.catalogLoading} aria-busy="true"><span className={styles.loadingDot} />Cargando servicios y precios…</div>
          : isError ? <div className={styles.catalogEmpty}><Smile size={32} strokeWidth={1.3} /><h3>Queremos orientarte bien.</h3><p>No pudimos cargar nuestros servicios. Puedes volver a intentarlo o escribirnos para consultar precios.</p><div className={styles.actions}><button type="button" className={styles.secondaryButton} onClick={() => void refetch()}>Volver a intentar</button><a href={clinic.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>Consultar por WhatsApp <ArrowUpRight size={15} /></a></div></div>
          : visible.length === 0 ? <div className={styles.catalogEmpty}><Search size={30} strokeWidth={1.3} /><h3>{allServices.length === 0 ? "No hay servicios disponibles por el momento" : specialty && !search ? "Hablemos de tu atención." : "No encontramos coincidencias."}</h3><p>{specialty && !search ? `Consulta con recepción los servicios y precios de ${specialty}. Te ayudamos a encontrar la atención que necesitas.` : "Prueba otra búsqueda o escríbenos para recibir orientación."}</p><div className={styles.actions}>{(specialty || search) && <button type="button" className={styles.secondaryButton} onClick={clearFilters}>Ver todos los servicios</button>}<a className={styles.primaryButton} href={clinic.whatsapp} target="_blank" rel="noopener noreferrer">Consultar precio <ArrowUpRight size={15} /></a></div></div>
          : <div className={styles.catalogGrid}>
            {visible.map((item) => {
              const details = specialties.find((entry) => entry.name === item.specialty);
              const Icon = details ? icons[details.icon] : Smile;
              const consultation = `${clinic.whatsapp}?text=${encodeURIComponent(`Hola, BIODENTIS. Quisiera información y disponibilidad para ${item.name}.`)}`;
              return <article key={item.id} className={styles.catalogCard} data-service-id={item.id}>
                <div className={styles.catalogCardHeader}><span className={styles.iconBox}><Icon size={21} strokeWidth={1.5} /></span><span className={styles.pill}>{item.category}</span></div>
                <span className={styles.catalogSpecialty}>{item.specialty}</span>
                <h3>{item.name}</h3>
                <p className={styles.catalogDescription}>{item.description || "Conoce los detalles de este procedimiento y recibe orientación para tu atención."}</p>
                <div className={styles.catalogPrice}><span>Precio de lista</span><strong>{item.price === null ? "Consultar precio" : formatPrice(item.price)}</strong>{item.durationMinutes !== null && <small><Clock3 size={13} />{item.durationMinutes} min aprox.</small>}</div>
                <a className={styles.catalogCardLink} href={consultation} target="_blank" rel="noopener noreferrer" aria-label={`Consultar ${item.name} por WhatsApp`}>Consultar este servicio <ArrowUpRight size={17} /></a>
              </article>;
            })}
          </div>}

        <div className={styles.pricingAssurance}>
          <ShieldCheck size={24} strokeWidth={1.5} />
          <div><strong>Sin dudas antes de comenzar.</strong><p>Precios en soles peruanos (PEN). El presupuesto final depende de tu evaluación y de los procedimientos que necesites.</p></div>
          <span><Check size={15} />Presupuesto personalizado</span>
        </div>
        <div className={styles.catalogHelp}><div><MessageCircle size={21} /><p><strong>¿No sabes qué servicio elegir?</strong><span>Cuéntanos qué necesitas. Te orientamos para dar el primer paso.</span></p></div><a className={styles.textLink} href={clinic.whatsapp} target="_blank" rel="noopener noreferrer">Hablemos <ArrowRight size={16} /></a></div>
      </div>
    </section>
  </>;
}
