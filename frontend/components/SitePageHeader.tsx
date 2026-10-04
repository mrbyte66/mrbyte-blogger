"use client";
import type { Theme } from "../lib/builder/model";
import { SlideLink } from "./SlideLink";
import { ThemeToggle } from "./SitePreferences";
import { AccountMenu } from "./auth/AccountMenu";
import { SavedLibraryLink } from "./saved/SaveArticleButton";
export function SitePageHeader({ theme, preview = false, account = true }: { theme: Theme; preview?: boolean; account?: boolean }) {
  return <header className="site-page-header" data-edit-field="layout"><SlideLink className="site-page-wordmark" href="/" direction="back">{theme.siteName}.</SlideLink><nav aria-label="Sayfa araçları"><SlideLink className="site-page-back" href="/" direction="back"><span aria-hidden="true">←</span> Siteye dön</SlideLink><ThemeToggle defaultDark={theme.surface === "night"} />{!preview && account && <><SavedLibraryLink /><AccountMenu /></>}</nav></header>;
}
