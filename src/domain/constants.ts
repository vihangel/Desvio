export const MEDIA_TYPES = ["image", "model", "video"] as const;
export const PRESENTATIONS = ["frame", "pedestal", "floor"] as const;
export type Presentation = (typeof PRESENTATIONS)[number];
export const EDITORIAL_STATUSES = [
  "draft",
  "in_review",
  "published",
  "archived",
] as const;
export const RIGHTS = ["reference", "demo", "licensed", "preview"] as const;
export const ROOM_LIMIT = 24;
export const ROOM_DEPTH = 12;

export const MODEL_FORMATS = ["glb", "stl", "obj"] as const;
export type ModelFormat = (typeof MODEL_FORMATS)[number];
// Where a work may sit inside a room, in metres from the room's centre.
export const ROOM_BOUNDS = {
  side: 4.8,
  minHeight: 0,
  maxHeight: 3.8,
  depth: 5.7,
};
export const SCALE_LIMITS = { min: 0.1, max: 4 };

const MB = 1_000_000;
export const megabytesLabel = (bytes: number) => `${bytes / MB} MB`;
// Largest file accepted at each step. "Input" limits apply before optimization.
export const UPLOAD_LIMITS = {
  remote: { image: 5 * MB, model: 24 * MB, audio: 20 * MB },
  local: { image: 1 * MB, file: 12 * MB },
  modelInput: 150 * MB,
  imageInput: 30 * MB,
  captions: 200_000,
} as const;
