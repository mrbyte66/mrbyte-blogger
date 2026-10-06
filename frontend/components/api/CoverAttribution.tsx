import type { Attribution } from "../../lib/api/content";
export function CoverAttribution({value}:{value?:Attribution|null}) {
 if(!value || value.provider!=="pexels" || !value.sourceUrl.startsWith("https://www.pexels.com/"))return null;
 return <small className="property-note">Fotoğraf: <a href={value.sourceUrl} target="_blank" rel="noopener noreferrer">{value.photographer} · Pexels</a></small>;
}
