"use client";
import {useEffect,useState} from "react";
import {api} from "../../lib/api/client";
import {useAuth} from "../auth/AuthProvider";
import type {BlogSeries} from "../../lib/series/model";
import {SlideLink} from "../SlideLink";
export function SeriesResume({series,onOpen}:{series:BlogSeries;onOpen?:(slug:string)=>void}){const auth=useAuth();const [slug,setSlug]=useState<string|null>(null);
 useEffect(()=>{setSlug(null);if(!series.serverPublished||!auth.session?.profile.verified)return;const abort=new AbortController();void api<{items:{articleId:string;lastVisitedAt:string}[]}>(`/me/series/${series.id}/history`,{signal:abort.signal}).then(data=>{const last=[...data.items].sort((a,b)=>b.lastVisitedAt.localeCompare(a.lastVisitedAt)).map(visit=>series.serverChapters?.find(a=>a.serverId===visit.articleId)).find(Boolean);if(last)setSlug(last.slug);}).catch(()=>{});return()=>abort.abort();},[series.id,series.serverChapters,auth.session?.profile.id,auth.session?.profile.verified]);
 if(!slug)return null;return onOpen?<button type="button" className="series-primary" onClick={()=>onOpen(slug)}>Son açtığım bölüme dön →</button>:<SlideLink className="series-primary" href={`/yazilar/${slug}`}>Son açtığım bölüme dön →</SlideLink>;
}
