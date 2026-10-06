import "./studio.css";
import { hasStudioAccess } from "../../lib/api/server";
import { StudioLogin } from "../../components/auth/StudioLogin";
import { StudioSession } from "../../components/auth/StudioSession";
import { SiteEditor } from "../../components/builder/SiteEditor";
export default async function Studio() {
  if (!(await hasStudioAccess())) return <StudioLogin />;
  return <StudioSession><SiteEditor /></StudioSession>;
}
