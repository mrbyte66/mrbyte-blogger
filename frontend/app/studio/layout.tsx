import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: null } };
export default function PrivateLayout({ children }: { children: ReactNode }) { return children; }
