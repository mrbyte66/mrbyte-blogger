import "./studio.css";
import { cookies } from "next/headers";
import { studioCookie, validStudioSession } from "../../lib/auth/studio-session";
import { StudioLogin } from "../../components/auth/StudioLogin";
import { StudioSession } from "../../components/auth/StudioSession";
import { SiteEditor } from "../../components/builder/SiteEditor";
export default async function Studio() {
  if (!validStudioSession((await cookies()).get(studioCookie)?.value)) return <StudioLogin />;
  return <StudioSession><SiteEditor /></StudioSession>;
}
