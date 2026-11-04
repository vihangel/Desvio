import {
  validateModel,
  validateAudio,
  validateImage,
} from "../../domain/uploadValidation";
import type { MediaService, UploadSource } from "../../domain/media";
import {
  UPLOAD_LIMITS,
  megabytesLabel,
  type ModelFormat,
} from "../../domain/constants";
import { isSessionUrl } from "../../domain/mediaUrls";
import { optimizeImage, optimizeModel } from "../media/optimizers";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export class LocalMediaService implements MediaService {
  readonly modelLimit = UPLOAD_LIMITS.local.file;
  readonly optimizeImage = optimizeImage;
  readonly optimizeModel = optimizeModel;
  async prepare(
    file: UploadSource,
    type: "image" | "model" | "audio",
  ): Promise<{ src: string; modelFormat?: ModelFormat }> {
    if (type === "model" || type === "audio") {
      if (file.size > UPLOAD_LIMITS.local.file)
        throw new Error(
          `Arquivo demonstrativo de até ${megabytesLabel(UPLOAD_LIMITS.local.file)}.`,
        );
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
      !IMAGE_TYPES.includes(file.type) ||
      file.size > UPLOAD_LIMITS.local.image
    )
      throw new Error(
        `Selecione PNG, JPEG ou WebP de até ${megabytesLabel(UPLOAD_LIMITS.local.image)}.`,
      );
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
    if (isSessionUrl(url)) URL.revokeObjectURL(url);
  }
}
export const localMediaService = new LocalMediaService();
