"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Article } from "../../lib/content";
import type { BlogSeries } from "../../lib/series/model";
import type { Theme } from "../../lib/builder/model";
export type PublicData = { articleTotal?:number; seriesTotal?:number; theme: Theme; articles: readonly Article[]; series: readonly BlogSeries[] };
const Context = createContext<PublicData | null>(null);
export function PublicDataProvider({ data, children }: { data: PublicData; children: ReactNode }) { return <Context.Provider value={data}>{children}</Context.Provider>; }
export function usePublicData() { return useContext(Context); }
