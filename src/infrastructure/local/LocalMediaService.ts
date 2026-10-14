import {
  validateModel,
  validateAudio,
  validateImage,
} from "../../domain/uploadValidation";
import type {
  MediaService,
  ModelOptimizationOptions,
  UploadSource,
} from "../../domain/media";
import type { MediaAsset } from "../../domain/entities";
export class LocalMediaService implements MediaService {
  readonly modelLimit = 12_000_000;
  async optimizeModel(file: UploadSource, options?: ModelOptimizationOptions) {
    const { optimizeModel } = await import("../media/modelOptimizer");
    return optimizeModel(file, options);
  }
  async prepare(
    file: UploadSource,
    type: "image" | "model" | "audio",
  ): Promise<{
    src: string;
    modelFormat?: import("../../domain/constants").ModelFormat;
  }> {
    if (type === "model" || type === "audio") {
      if (file.size > this.modelLimit)
        throw new Error("Arquivo demonstrativo de até 12 MB.");
      const bytes = await file.arrayBuffer();
      const modelFormat =
        type === "model" ? validateModel(bytes, file.name) : undefined;
      const audio =
        type === "audio" ? validateAudio(bytes, file.name) : undefined;
      return {
        src: URL.createObjectURL(
          new Blob([bytes], {
            type: audio?.mime ?? "application/octet-stream",
          }),
        ),
        modelFormat,
      };
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_000_000
    )
      throw new Error("Selecione PNG, JPEG ou WebP de até 1 MB.");
    const bytes = await file.arrayBuffer();
    validateImage(bytes, file.type);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ src: String(reader.result) });
      reader.onerror = () => reject(new Error("Falha ao ler imagem."));
      reader.readAsDataURL(new Blob([bytes], { type: file.type }));
    });
  }
  release(url: string) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
export const localMediaService = new LocalMediaService();
