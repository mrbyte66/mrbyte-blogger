"use client";

import { useState } from "react";

/** Decorative card art; the adjacent title supplies the accessible name. */
export function CatalogCover({ src, fallback, className = "" }: { src?: string; fallback: string; className?: string }) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const image = [src, fallback].find((source) => source && !failedSources.includes(source));
  const classes = `catalog-cover ${className}`;
  return image
    ? <img className={classes} src={image} alt="" width={1200} height={720} loading="lazy" decoding="async" onError={() => setFailedSources((failed) => [...failed, image])} />
    : <span className={classes} aria-hidden="true" />;
}
