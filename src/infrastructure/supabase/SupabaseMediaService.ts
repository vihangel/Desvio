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
import type { RemoteClient } from "./client";
export class SupabaseMediaService implements MediaService {
  readonly modelLimit = 24_000_000;
  async optimizeImage(file: UploadSource, maxSize: number) {
    const { optimizeImage } = await import("../media/imageOptimizer");
    return optimizeImage(file, maxSize);
  }
  async optimizeModel(file: UploadSource, options?: ModelOptimizationOptions) {
    const { optimizeModel } = await import("../media/modelOptimizer");
    return optimizeModel(file, options);
  }
  constructor(private readonly client: () => RemoteClient) {}
  async prepare(file: UploadSource, type: "image" | "model" | "audio") {
    const limit =
      type === "model"
        ? this.modelLimit
        : type === "audio"
          ? 20_000_000
          : 5_000_000;
    if (file.size > limit)
      throw new Error(`Arquivo acima do limite de ${limit / 1_000_000} MB.`);
    const bytes = await file.arrayBuffer();
    const modelFormat =
      type === "model" ? validateModel(bytes, file.name) : undefined;
    const audio =
      type === "audio" ? validateAudio(bytes, file.name) : undefined;
    if (type === "image") validateImage(bytes, file.type);
    const client = this.client();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      throw new Error("Entre na conta antes de enviar arquivos.");
    const ext =
      type === "model"
        ? modelFormat
        : type === "audio"
          ? audio!.ext
          : { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
              file.type
            ];
    const path = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
    const bucket = "desvio-media";
    const upload = await client.storage
      .from(bucket)
      .upload(path, new Blob([bytes]), {
        contentType:
          type === "model"
            ? modelFormat === "glb"
              ? "model/gltf-binary"
              : "application/octet-stream"
            : type === "audio"
              ? audio!.mime
              : file.type,
        upsert: false,
      });
    if (upload.error) throw upload.error;
    const signed = await client.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
    if (signed.error) {
      await client.storage.from(bucket).remove([path]);
      throw signed.error;
    }
    return { src: signed.data.signedUrl, bucket, path, modelFormat };
  }
  release(_url: string) {
    /* Persistent files are retired by the curator, never by URL expiry. */
  }
}
