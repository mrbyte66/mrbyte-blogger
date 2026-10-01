export type CharacterBounds = { left: number; top: number; width: number; height: number };
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Gaze in the source image's 1024×1536 coordinates, bounded inside the lenses. */
export function getScreenGaze(pointerX: number, pointerY: number, bounds: CharacterBounds) {
  const x = clamp((pointerX - (bounds.left + bounds.width * 0.442)) / Math.max(1, bounds.width * 0.85));
  const y = clamp((pointerY - (bounds.top + bounds.height * 0.388)) / Math.max(1, bounds.height * 0.5));
  return { x: x * 24, y: y * 17 };
}
