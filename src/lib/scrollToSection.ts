/**
 * Smooth-scrolls to a `[id]` section, offsetting for the fixed navbar height.
 * Shared by the navbar, command palette, and hero terminal so all three
 * navigate identically instead of drifting out of sync.
 */
export function scrollToSection(id: string, offset = 80) {
  const element = document.getElementById(id);
  if (!element) return false;
  const y = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: "smooth" });
  return true;
}
