"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ArrowUpRight, Stethoscope } from "lucide-react";
import type { PublicDentist } from "@biodentis/shared-types";
import { initialsOf } from "@/components/ui/user-avatar";
import styles from "./landing.module.css";

function Portrait({ person }: { person: PublicDentist }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = person.user.avatarUrl;
  return <div className={styles.portrait}>
    {src && failedSrc !== src ? (
      // Las fotos del perfil pueden ser data URL; no dependen de servicios externos.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`Foto de ${person.user.firstName} ${person.user.lastName}`} loading="lazy" onError={() => setFailedSrc(src)} />
    ) : <span className={styles.portraitFallback} aria-label="Sin foto de perfil">{initialsOf(person.user.firstName, person.user.lastName)}</span>}
    {person.university && <span className={styles.university}>{person.university}</span>}
  </div>;
}

export function DentistCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const { data: dentists, isPending, isError, refetch } = useQuery<PublicDentist[]>({
    queryKey: ["public-dentists"],
    queryFn: async () => {
      const response = await fetch("/api/public/dentists", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar el equipo");
      return response.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (isPending) return <p className={styles.teamMessage} role="status">Cargando nuestro equipo...</p>;
  if (isError) return <div className={styles.teamMessage} role="status"><p>No pudimos cargar el equipo en este momento.</p><button className={styles.secondaryButton} onClick={() => void refetch()}>Volver a intentar</button></div>;
  if (!dentists?.length) return <p className={styles.teamMessage}>Pronto podrás conocer aquí a nuestro equipo de odontólogos.</p>;

  const scroll = (direction: number) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current?.scrollBy({ left: direction * track.current.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
  };

  return <>
    <div ref={track} className={styles.teamCarousel} aria-label="Perfiles de odontólogos" tabIndex={0}>
      {dentists.map((person) => <article key={person.id} className={styles.teamCard} data-dentist-id={person.id}>
        <Portrait person={person} />
        <div className={styles.teamInfo}>
          <h3>{person.user.firstName} {person.user.lastName}</h3>
          <p className={styles.specialty}>{person.specialty}</p>
          {person.licenseNumber && <span className={styles.credential}><Stethoscope size={12} /> REGISTRO: {person.licenseNumber}</span>}
          <Link className={styles.secondaryButton} href="/login?callbackUrl=%2Fappointments%3Fnew%3D1">Agendar una cita <ArrowUpRight size={14} /></Link>
        </div>
      </article>)}
    </div>
    <div className={styles.carouselControls}><span>Desliza para conocer a todo nuestro equipo.</span><div><button type="button" className={styles.secondaryButton} aria-label="Ver odontólogos anteriores" onClick={() => scroll(-1)}><ArrowLeft size={16} /></button><button type="button" className={styles.secondaryButton} aria-label="Ver siguientes odontólogos" onClick={() => scroll(1)}><ArrowRight size={16} /></button></div></div>
  </>;
}
