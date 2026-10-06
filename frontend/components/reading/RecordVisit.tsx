"use client";
import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../../lib/api/client";
export function RecordVisit({articleId,revisionId}:{articleId?:string;revisionId?:string}) {
 const auth=useAuth();const user=auth.session?.profile.verified?auth.session.profile.id:null;
 useEffect(()=>{if(!user||!articleId||!revisionId)return;const abort=new AbortController();
 let recorded=false;function record(){if(recorded||document.visibilityState!=="visible")return;recorded=true;void api("/me/visits",{method:"POST",signal:abort.signal,body:{eventId:crypto.randomUUID(),articleId,revisionId,visitedAt:new Date().toISOString()}}).catch(()=>{recorded=false;});}
 const timer=setTimeout(record,250);document.addEventListener("visibilitychange",record);
 return()=>{clearTimeout(timer);document.removeEventListener("visibilitychange",record);abort.abort();};},[user,articleId,revisionId]);return null;
}
