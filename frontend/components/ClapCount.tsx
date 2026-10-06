"use client";

import { EngagementIcon } from "./EngagementIcon";

import { useClaps } from "../lib/reactions/use-claps";

export function ClapCount({ slugs, series = false }: { slugs: readonly string[]; series?: boolean }) {
  const { count, error } = useClaps();
  const total = count(slugs);
  return <span className="clap-count" aria-label={error ? "Alkış sayısı okunamadı" : `${total} alkış${series ? " · seri yazılarının toplamı" : ""}`} title={error || `${series ? "Seri yazılarının toplamı. " : ""}Sunucudaki toplam alkışlar.`}><EngagementIcon kind="clap" /> {error ? "—" : total}</span>;
}
