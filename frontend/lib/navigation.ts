import { findArticle, type Topic } from "./content";

export type Section = "writing" | "projects" | "about";
export type Navigation = { section: Section | null; articleSlug: string | null; topic: Topic };
export type NavigationAction =
  | { type: "open"; section: Section }
  | { type: "article"; slug: string }
  | { type: "filter"; topic: Topic }
  | { type: "back" }
  | { type: "close" };

export const initialNavigation: Navigation = { section: null, articleSlug: null, topic: "Tümü" };

export function navigate(state: Navigation, action: NavigationAction): Navigation {
  switch (action.type) {
    case "open": return { ...state, section: action.section, articleSlug: null };
    case "article": return findArticle(action.slug) ? { ...state, section: "writing", articleSlug: action.slug } : state;
    case "filter": return { ...state, topic: action.topic, articleSlug: null };
    case "back": return { ...state, articleSlug: null };
    case "close": return { ...state, section: null, articleSlug: null };
  }
}
