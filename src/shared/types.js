import { DEFAULT_ACTIVE_PANELS, PANEL_IDS } from "@shared/panels";

const MAX_ACTIVE_PANELS = 2;

const CANVAS_ORIENTATIONS = ["left-right", "top-bottom"];
const DEFAULT_CANVAS_ORIENTATION = "left-right";
const isValidCanvasOrientation = (value) => CANVAS_ORIENTATIONS.includes(value);

export {
  CANVAS_ORIENTATIONS,
  DEFAULT_ACTIVE_PANELS,
  DEFAULT_CANVAS_ORIENTATION,
  isValidCanvasOrientation,
  MAX_ACTIVE_PANELS,
  PANEL_IDS,
};
