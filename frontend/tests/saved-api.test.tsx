import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { SavedProvider } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { clearCsrf } from "../lib/api/client";
let saved=false, rejected=false;let calls:string[]=[];
beforeEach(() => {
 clearCsrf(); localStorage.clear(); saved=false;rejected=false;calls=[];
 vi.stubGlobal("fetch",vi.fn(async (url:string,init?:RequestInit) => {
  calls.push(`${init?.method ?? "GET"} ${url}`);
  if(url.endsWith("/auth/csrf"))return Response.json({token:"csrf",headerName:"X-CSRF-TOKEN"});
  if(url.endsWith("/auth/session"))return Response.json({authenticated:true,expiresAt:new Date(Date.now()+3600000).toISOString(),profile:{id:"reader",name:"Reader",email:"reader@example.com",role:"member",verified:true,version:0,preferences:{publicationEmail:true,timeZone:"Europe/Istanbul"}}});
  if(url.endsWith("/me/collections"))return Response.json({items:[{id:"collection-id",name:"Genel",isDefault:true,version:0}]});
  if(url.includes("/me/bookmarks?"))return Response.json({items:saved?[{articleId:"article-id",collectionId:"collection-id",available:true,article:{id:"article-id",slug:"article",title:"Article",abstract:"Summary",bodyPreview:"Summary",categories:[],displayDate:"2026-10-05",readingMinutes:1,stats:{views:0,claps:0,saves:1},cover:null}}]:[],totalElements:saved?1:0});
  if(url.endsWith("/articles/by-slug/article"))return Response.json({id:"article-id"});
  if(url.endsWith("/me/bookmarks/article-id")){if(rejected)return Response.json({code:"ACCESS_DENIED"},{status:403});saved=init?.method!=="DELETE";return init?.method==="DELETE"?new Response(null,{status:204}):Response.json({articleId:"article-id"});}
  throw new Error("Unexpected API: "+url);
 }));
});
afterEach(() => vi.unstubAllGlobals());
it("waits for server save confirmation and removes the server bookmark without local persistence",async()=>{
 render(<AuthProvider><SavedProvider><SaveArticleButton slug="article" title="Article" /></SavedProvider></AuthProvider>);
 const button=await screen.findByRole("button",{name:"Yazıyı kaydet: Article"});await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(button);await screen.findByText("Kaydedildi");expect(saved).toBe(true);expect(localStorage.length).toBe(0);
 fireEvent.click(screen.getByRole("button",{name:"Kaydı kaldır"}));await waitFor(()=>expect(saved).toBe(false));expect(calls).toContain("DELETE /api/v1/me/bookmarks/article-id");
});
it("does not present a failed write as a saved bookmark",async()=>{
 rejected=true;render(<AuthProvider><SavedProvider><SaveArticleButton slug="article" title="Article" /></SavedProvider></AuthProvider>);
 const button=await screen.findByRole("button",{name:"Yazıyı kaydet: Article"});await waitFor(()=>expect((button as HTMLButtonElement).disabled).toBe(false));fireEvent.click(button);
 await waitFor(()=>expect(calls).toContain("PUT /api/v1/me/bookmarks/article-id"));expect(saved).toBe(false);expect(screen.queryByText("Kaydedildi")).toBeNull();
});
