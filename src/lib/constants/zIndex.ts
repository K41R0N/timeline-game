/**
 * Z-Index Token System
 *
 * Clear layer hierarchy for UI elements to prevent overlap bugs.
 *
 * Hierarchy (lowest to highest):
 * 1. Background/Canvas (0-9)
 * 2. Timeline elements (10-19)
 * 3. UI Controls (20-29)
 * 4. Floating elements (30-49)
 * 5. Overlays/Modals (50-99)
 * 6. Critical toasts (100+)
 */

export const Z_INDEX = {
  // Canvas layer
  BACKGROUND: 0,
  TIMELINE_CANVAS: 1,

  // Timeline elements
  TIMELINE_BAR: 10,
  TIMELINE_NODES: 11,
  TIMELINE_NODE_HOVERED: 12,

  // UI Controls
  ZOOM_CONTROLS: 20,
  SEARCH_BAR: 21,
  HEADER_CONTROLS: 22,

  // Floating elements
  TOOLTIPS: 30,
  HOVER_CARDS: 31,

  // Overlays
  DETAIL_PANEL: 50,
  MODAL_BACKDROP: 60,
  MODAL_CONTENT: 61,

  // Critical alerts
  TOAST: 100,
  ERROR_TOAST: 101
} as const;

export type ZIndexToken = typeof Z_INDEX[keyof typeof Z_INDEX];
