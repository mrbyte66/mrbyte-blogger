"use client";
import { useState } from "react";
import { api } from "../../lib/api/client";
export function MediaUpload({onUpload}:{onUpload:(url:string)=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 return <div className="studio-field"><label><span>Görsel yükle · JPEG, PNG veya WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
 const file=event.target.files?.[0];if(!file)return;event.target.value="";if(file.size>10*1024*1024){setError("Görsel en fazla 10 MB olabilir.");return;}
 setBusy(true);setError("");try{const form=new FormData();form.append("file",file);const asset=await api<{id:string}>("/studio/media",{method:"POST",body:form,idempotencyKey:crypto.randomUUID()});onUpload(`/api/v1/media/${asset.id}`);}catch(error){setError(error instanceof Error?error.message:"Görsel yüklenemedi.");}finally{setBusy(false);}
 }}/></label>{busy&&<p role="status">Görsel yükleniyor…</p>}{error&&<p role="alert">{error}</p>}</div>;
}
