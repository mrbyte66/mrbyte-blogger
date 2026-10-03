import type { ReactNode } from "react";
import { ThemeToggle } from "../SitePreferences";

/** Shared chrome keeps navigation and document actions in one workspace. */
export function StudioHeader({ navigation, actions, status }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode }) {
  return <header className="studio-topbar">
    <div className="studio-brand"><span className="studio-logo" aria-hidden="true">m<span>↗</span></span><strong>mrbyte<span> / </span>studio</strong></div>
    {navigation}
    <div className="studio-commandbar">{status}<div className="studio-top-actions"><ThemeToggle />{actions}</div></div>
  </header>;
}
