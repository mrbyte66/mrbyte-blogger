"use client";
import {useEffect,useState} from "react";
import {api} from "../../lib/api/client";
import {readReadingDocument,writeReadingDocument} from "../../lib/reading/storage";
import type {Block} from "../../lib/api/content";
/** Explicit transfer only. Local records remain until the server accepts each individual mark. */
export function GuestNotesImport({articleId,revisionId,legacySlug,blocks,onImported}:{articleId:string;revisionId:string;legacySlug?:string;blocks?:Block[];onImported:()=>void}){
 const [count,setCount]=useState(0),[busy,setBusy]=useState(false),[status,setStatus]=useState("");
 function source(){const current=readReadingDocument(articleId);if(current.document.marks.length||!legacySlug)return current;return readReadingDocument(legacySlug);}
 useEffect(()=>{setCount(source().document.marks.length);},[articleId,legacySlug]);
 async function transfer(){if(busy||!window.confirm("Bu cihazdaki notlar bu hesaba aktarılsın mı? Aktarılamayan notlar cihazda korunur."))return;setBusy(true);setStatus("");try{
 const document=source().document;const serialized=JSON.stringify({articleId,revisionId,marks:document.marks});const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(serialized)))).map(b=>b.toString(16).padStart(2,"0")).join("");const clientImportId=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
 function blockId(anchor:string){if(anchor==="excerpt")return "abstract";if(anchor.startsWith("paragraph-"))return blocks?.filter(b=>b.type==="paragraph")[Number(anchor.slice(10))]?.id ?? anchor;if(["figure","code","table"].includes(anchor))return blocks?.find(b=>b.type===(anchor==="figure"?"image":anchor))?.id ?? anchor;return anchor;}
 const items=document.marks.slice(0,200).map(mark=>({articleId,id:mark.id,annotation:{kind:mark.kind,revisionId,fragments:mark.fragments.map(({anchorId,...fragment})=>({...fragment,blockId:blockId(anchorId)})),note:mark.note}}));
 const result=await api<{accepted:string[];rejected:{id?:string;code:string}[]}>("/me/imports/annotations",{method:"POST",body:{clientImportId,items}});const accepted=new Set(result.accepted);const remaining=document.marks.filter(mark=>!accepted.has(mark.id));const saved=writeReadingDocument({...document,marks:remaining});setCount(remaining.length);setStatus(`${accepted.size} not aktarıldı.${result.rejected.length?` ${result.rejected.length} not aktarılmadı; metin eşleşmesini kontrol et.`:""}${!saved?" Cihaz kaydı güncellenemedi; mevcut kayıt korundu.":""}`);onImported();
 }catch(e){setStatus(e instanceof Error?e.message:"Notlar aktarılamadı; cihaz kaydı korundu.");}finally{setBusy(false);}}
 return count||status?<div className="reading-availability">{count>0&&<button type="button" disabled={busy} onClick={()=>void transfer()}>Cihazdaki {count} notu hesabıma aktar</button>}{status&&<p role="status">{status}</p>}</div>:null;
}
