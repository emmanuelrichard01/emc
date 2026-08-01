// Shared path data for the E·MC logo mark. Used by both the navbar logo
// (animated stroke draw-in, viewBox 0 0 200 120) and the boot loader
// (simple fade-in, viewBox 0 0 200 200) — the two consumers apply their
// own SVG wrapper and animation treatment on top of these same three paths.
export const LOGO_PATHS = [
  "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
  "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
  "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z",
] as const;
