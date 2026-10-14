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
