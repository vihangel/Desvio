import type { UploadSource } from "../../domain/media";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Scales an image down in the browser and re-encodes it (WebP, else JPEG).
export async function optimizeImage(
  source: UploadSource,
  maxSize: number,
): Promise<UploadSource> {
  if (!IMAGE_TYPES.includes(source.type))
    throw new Error("Selecione uma imagem PNG, JPEG ou WebP.");
  if (source.size > 30_000_000) throw new Error("Imagem acima de 30 MB.");
  const bitmap = await createImageBitmap(
    new Blob([await source.arrayBuffer()], { type: source.type }),
  );
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement("canvas"), {
    width: Math.max(1, Math.round(bitmap.width * scale)),
    height: Math.max(1, Math.round(bitmap.height * scale)),
  });
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  const bytes = await blob.arrayBuffer();
  return {
    name:
      source.name.replace(/\.\w+$/, "") +
      (blob.type === "image/webp" ? ".webp" : ".jpg"),
    type: blob.type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes,
  };
}
