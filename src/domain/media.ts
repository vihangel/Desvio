import type { MediaAsset } from "./entities";
// Browser File implements this port, but the domain does not require DOM types.
export interface UploadSource {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface MediaService {
  prepare(file: UploadSource, type: MediaAsset["type"]): Promise<string>;
  release(url: string): void;
}
