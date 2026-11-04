import type {
  ModelOptimizationOptions,
  UploadSource,
} from "../../domain/media";
// Heavy libraries load only when someone actually sends a file.
export async function optimizeImage(file: UploadSource, maxSize: number) {
  const { optimizeImage } = await import("./imageOptimizer");
  return optimizeImage(file, maxSize);
}
export async function optimizeModel(
  file: UploadSource,
  options?: ModelOptimizationOptions,
) {
  const { optimizeModel } = await import("./modelOptimizer");
  return optimizeModel(file, options);
}
