"use client";
import { useThemeWorkspace } from "../../components/data/SiteData";

/**
 * Theme workspace: the applied theme for visitors; draft + applied with server persistence in Studio.
 * Drafts autosave; Apply is an explicit server operation.
 */
export function useWorkspace() {
  return useThemeWorkspace();
}
