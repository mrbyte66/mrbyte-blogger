import "../studio.css";
import {hasStudioAccess} from "../../../lib/api/server";
import {StudioLogin} from "../../../components/auth/StudioLogin";
import {StudioSession} from "../../../components/auth/StudioSession";
import {StudioTools} from "../../../components/builder/StudioTools";
export default async function Page(){if(!await hasStudioAccess())return <StudioLogin/>;return <StudioSession><StudioTools/></StudioSession>;}
