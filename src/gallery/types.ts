import type { Placement } from "../domain/entities";
export interface GalleryNavigation {
  room: number;
  version: number;
  focus?: Placement;
}
