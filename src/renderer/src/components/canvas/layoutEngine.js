import {
  DEFAULT_CANVAS_ORIENTATION,
  MAX_ACTIVE_PANELS,
  isValidCanvasOrientation,
} from "@shared/types";

const LAYOUT_TEMPLATES = Object.freeze({
  "left-right": {
    1: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }],
    2: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 0, col: 1, rowSpan: 1, colSpan: 1 },
    ],
  },
  "top-bottom": {
    1: [{ row: 0, col: 0, rowSpan: 1, colSpan: 1 }],
    2: [
      { row: 0, col: 0, rowSpan: 1, colSpan: 1 },
      { row: 1, col: 0, rowSpan: 1, colSpan: 1 },
    ],
  },
});

const computeCanvasLayout = (panelIds, orientation) => {
  if (panelIds.length > MAX_ACTIVE_PANELS) {
    throw new Error(`Canvas supports at most ${MAX_ACTIVE_PANELS} panels`);
  }

  if (panelIds.length === 0) {
    return [];
  }

  const resolvedOrientation = isValidCanvasOrientation(orientation)
    ? orientation
    : DEFAULT_CANVAS_ORIENTATION;
  const template = LAYOUT_TEMPLATES[resolvedOrientation][panelIds.length] || [];

  return panelIds.map((id, index) => ({
    id,
    ...template[index],
  }));
};

export { computeCanvasLayout };
