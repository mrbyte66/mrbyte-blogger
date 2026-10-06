import { serverApi } from "../../lib/api/server";
export const dynamic="force-dynamic";
export async function GET() {
 try { const response=await serverApi("/site");return Response.json({status:response.ok?"UP":"DOWN"},{status:response.ok?200:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}}); }
 catch {return Response.json({status:"DOWN"},{status:503,headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex"}});}
}
