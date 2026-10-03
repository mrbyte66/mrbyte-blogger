import type { ReactNode } from "react";
import { ThemeToggle } from "../SitePreferences";

/** A single desktop command row for identity, page selection, state and actions. */
export function StudioHeader({ navigation, actions, status }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode }) {
  return <header className="studio-topbar">
    <div className="studio-brand"><span className="studio-logo" aria-hidden="true">m<span>↗</span></span><strong>studio</strong></div>
    {navigation}
    <div className="studio-header-state">{status}</div>
    <div className="studio-top-actions"><ThemeToggle />{actions}</div>
  </header>;
}
