import { afterEach, expect, it, vi } from "vitest";
import { PartialStudioSaveError, documentFor, ownerArticle, saveStudioArticle, type ArticleRecord } from "../lib/api/studio";
import { clearCsrf } from "../lib/api/client";
const category = {id:"category-id",name:"Custom topic",slug:"custom-topic",version:0};
function record():ArticleRecord { return {id:"article-id",version:4,slug:"article",title:"Article",eyebrow:"Notes",abstract:"Intro",displayDate:"2026-10-06",createdAt:"2026-10-01T00:00:00Z",status:"draft",visibility:"private",scheduledAt:null,scheduleZone:null,revisionId:"revision-id",categoryIds:[category.id],document:{schemaVersion:1,blocks:[{id:"paragraph-id",type:"paragraph",text:"Prose"},{id:"heading-id",type:"heading",level:2,text:"Heading"},{id:"quote-id",type:"quote",text:"Quote",attribution:"Source"}]},presentation:{width:"comfortable",heading:"left",showMeta:true},seo:{title:null,description:null,indexable:true},cover:{mode:"none",assetId:null},seriesPlacement:null}; }
afterEach(()=>{vi.unstubAllGlobals();clearCsrf();});
it("preserves stable anchors and non-paragraph blocks when editing prose",()=>{
 const article=ownerArticle(record(),[category]);article.paragraphs=["Edited"];
 const doc=documentFor(article);
 expect(doc.blocks).toEqual([{id:"paragraph-id",type:"paragraph",text:"Edited"},{id:"heading-id",type:"heading",level:2,text:"Heading"},{id:"quote-id",type:"quote",text:"Quote",attribution:"Source"}]);
});
it("updates content with server version while leaving visibility to its separate lifecycle command",async()=>{
 clearCsrf();let write:Record<string,unknown>|undefined;
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/auth/csrf"))return Response.json({token:"csrf",headerName:"X-CSRF-TOKEN"});
  if(url.endsWith("/studio/categories"))return Response.json({items:[category]});
  if(url.endsWith("/studio/articles/article-id")){expect(new Headers(init?.headers).get("If-Match")).toBe('"4"');write=JSON.parse(init!.body as string);return Response.json({...record(),version:5});}
  throw new Error("Unexpected API request: "+url);
 }));
 const article=ownerArticle(record(),[category]);article.paragraphs=["Edited"];
 const saved=await saveStudioArticle(article,{articles:[article],series:[]},null);
 expect(write?.visibility).toBeNull();expect(write?.seriesVersions).toEqual([]);expect(saved.serverVersion).toBe(5);expect(saved.visibility).toBe("private");
});

it("keeps the persisted ID and version when a later publish fails, so retry cannot create a duplicate",async()=>{
 clearCsrf();vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url.endsWith("/auth/csrf"))return Response.json({token:"csrf",headerName:"X-CSRF-TOKEN"});
  if(url.endsWith("/studio/categories"))return Response.json({items:[category]});
  if(url.endsWith("/studio/articles/article-id"))return Response.json({...record(),version:5,visibility:"public"});
  if(url.endsWith("/actions"))return Response.json({code:"PUBLISH_REQUIRES_CONTENT"},{status:422});
  throw new Error("Unexpected API request: "+url);
 }));const article=ownerArticle({...record(),visibility:"public"},[category]);article.status="published";
 try{await saveStudioArticle(article,{articles:[article],series:[]},null);throw new Error("Expected failure");}
 catch(cause){expect(cause).toBeInstanceOf(PartialStudioSaveError);const partial=(cause as PartialStudioSaveError).draft;expect(partial.kind).toBe("article");if(partial.kind==="article"){expect(partial.article.serverVersion).toBe(5);expect(partial.article.status).toBe("draft");}}
});

it("revokes public access before submitting text intended to be private",async()=>{
 clearCsrf();const calls:string[]=[];
 vi.stubGlobal("fetch",vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith("/auth/csrf"))return Response.json({token:"csrf",headerName:"X-CSRF-TOKEN"});
  if(url.endsWith("/studio/categories"))return Response.json({items:[category]});
  if(url.endsWith("/actions")){calls.push("make-private");expect(JSON.parse(init!.body as string).action).toBe("make-private");return Response.json({...record(),version:5});}
  if(url.endsWith("/studio/articles/article-id")){calls.push("content-update");expect(new Headers(init?.headers).get("If-Match")).toBe('"5"');return Response.json({...record(),version:6});}
  throw new Error("Unexpected API request: "+url);
 }));const article=ownerArticle({...record(),visibility:"public",status:"published"},[category]);article.visibility="private";article.status="draft";article.paragraphs=["Private edits"];
 const saved=await saveStudioArticle(article,{articles:[article],series:[]},null);
 expect(calls).toEqual(["make-private","content-update"]);expect(saved.visibility).toBe("private");expect(saved.serverVersion).toBe(6);
});
