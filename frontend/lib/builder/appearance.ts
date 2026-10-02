import type { CSSProperties } from "react";
import { accentColor, type Theme } from "./model";

export function accentForeground(color: string): string {
  const components = [1, 3, 5].map((start) => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
  // Keep a 4.5:1 text contrast even for custom mid-tone accent colors.
  if (luminance >= 0.25) return "#17251c";
  return luminance > 0.183 ? "#000000" : "#ffffff";
}

export function themeAppearance(theme: Theme): { className: string; style: CSSProperties } {
  const color = accentColor(theme.accent);
  return {
    className: `theme-site typography-${theme.typography} surface-${theme.surface} width-${theme.width} spacing-${theme.spacing}`,
    style: { "--theme-accent": color, "--accent": color, "--accent-ink": accentForeground(color) } as CSSProperties,
  };
}
