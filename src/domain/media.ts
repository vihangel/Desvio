import type { MediaAsset } from "./entities";
// Browser File implements this port, but the domain does not require DOM types.
export interface UploadSource {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface ModelOptimizationOptions {
  // Fraction of vertices to keep (0–1). Omitted: geometry is not simplified.
  simplify?: number;
  maxTextureSize?: number;
}
export interface ModelOptimization {
  file: UploadSource;
  originalSize: number;
  triangles: number;
  optimizedTriangles: number;
}
export interface MediaService {
  // Largest stored 3D file, after optimization.
  readonly modelLimit: number;
  // Shrinks textures and compresses geometry before upload; STL/OBJ become GLB.
  optimizeModel?(
    file: UploadSource,
    options?: ModelOptimizationOptions,
  ): Promise<ModelOptimization>;
  prepare(
    file: UploadSource,
    type: "image" | "model" | "audio",
  ): Promise<{
    src: string;
    bucket?: string;
    path?: string;
    modelFormat?: import("./constants").ModelFormat;
  }>;
  release(url: string): void;
}
