import type { MediaService, UploadSource } from "../../domain/media";
import type { MediaAsset } from "../../domain/entities";
export class LocalMediaService implements MediaService {
  async prepare(file: UploadSource, type: MediaAsset["type"]): Promise<string> {
    if (type === "model") {
      if (!file.name.toLowerCase().endsWith(".glb") || file.size > 12_000_000)
        throw new Error("Selecione um GLB de até 12 MB.");
      const magic = new Uint8Array(await file.arrayBuffer()).subarray(0, 4);
      if (String.fromCharCode(...magic) !== "glTF")
        throw new Error("O arquivo não é um GLB válido.");
      return URL.createObjectURL(
        new Blob([await file.arrayBuffer()], { type: file.type }),
      );
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_000_000
    )
      throw new Error("Selecione PNG, JPEG ou WebP de até 1 MB.");
    const bytes = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler imagem."));
      reader.readAsDataURL(new Blob([bytes], { type: file.type }));
    });
  }
  release(url: string) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
export const localMediaService = new LocalMediaService();
