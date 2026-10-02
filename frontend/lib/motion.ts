/** Keep programmatic scrolling aligned with the shared accessibility preference. */
export function scrollBehavior(): ScrollBehavior {
  return document.documentElement.dataset.motion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
