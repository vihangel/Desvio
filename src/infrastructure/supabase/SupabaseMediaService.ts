import {
  validateModel,
  validateAudio,
  validateImage,
} from "../../domain/uploadValidation";
import type { MediaService, UploadSource } from "../../domain/media";
import { UPLOAD_LIMITS, megabytesLabel } from "../../domain/constants";
import { optimizeImage, optimizeModel } from "../media/optimizers";
import type { RemoteClient } from "./client";
const BUCKET = "desvio-media";
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
export class SupabaseMediaService implements MediaService {
  readonly modelLimit = UPLOAD_LIMITS.remote.model;
  readonly optimizeImage = optimizeImage;
  readonly optimizeModel = optimizeModel;
  constructor(private readonly client: () => RemoteClient) {}
  async prepare(file: UploadSource, type: "image" | "model" | "audio") {
    const limit = UPLOAD_LIMITS.remote[type];
    if (file.size > limit)
      throw new Error(`Arquivo acima do limite de ${megabytesLabel(limit)}.`);
    const bytes = await file.arrayBuffer();
    const modelFormat =
      type === "model" ? validateModel(bytes, file.name) : undefined;
    // The bucket only takes GLB: models go through the optimizer first.
    if (modelFormat && modelFormat !== "glb")
      throw new Error("Otimize o modelo antes de enviar.");
    const audio =
      type === "audio" ? validateAudio(bytes, file.name) : undefined;
    if (type === "image") validateImage(bytes, file.type);
    const client = this.client();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user)
      throw new Error("Entre na conta antes de enviar arquivos.");
    const ext =
      type === "model"
        ? "glb"
        : type === "audio"
          ? audio!.ext
          : IMAGE_EXTENSIONS[file.type];
    const contentType =
      type === "model"
        ? "model/gltf-binary"
        : type === "audio"
          ? audio!.mime
          : file.type;
    const path = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
    const upload = await client.storage
      .from(BUCKET)
      .upload(path, new Blob([bytes]), { contentType, upsert: false });
    if (upload.error) throw upload.error;
    const signed = await client.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    if (signed.error) {
      await client.storage.from(BUCKET).remove([path]);
      throw signed.error;
    }
    return { src: signed.data.signedUrl, bucket: BUCKET, path, modelFormat };
  }
  release(_url: string) {
    /* Persistent files are retired by the curator, never by URL expiry. */
  }
}
