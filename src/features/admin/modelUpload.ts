import type {
  ModelOptimization,
  ModelOptimizationOptions,
  UploadSource,
} from "../../domain/media";
// Above this, a scene stays heavy on phones even when the file is small.
export const HEAVY_TRIANGLES = 1_500_000;
export const megabytes = (bytes: number) =>
  bytes < 1_000_000
    ? `${Math.max(1, Math.round(bytes / 1000))} KB`
    : `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
// Escalates only as far as needed: smaller textures happen silently; reducing
// the geometry changes the work's shape, so it is asked first.
export async function optimizeForUpload(
  file: UploadSource,
  limit: number,
  optimize: (options: ModelOptimizationOptions) => Promise<ModelOptimization>,
  report: (message: string) => void,
  confirm: (message: string) => boolean = (message) => window.confirm(message),
) {
  report(`Otimizando “${file.name}” (${megabytes(file.size)})…`);
  let result = await optimize({});
  if (result.file.size > limit) {
    report("Ainda acima do limite. Reduzindo as texturas…");
    result = await optimize({ maxTextureSize: 1024 });
  }
  const tooBig = result.file.size > limit;
  if (!tooBig && result.triangles <= HEAVY_TRIANGLES) return result;
  const reason = tooBig
    ? `Mesmo otimizado, o modelo ficou com ${megabytes(result.file.size)} (limite: ${megabytes(limit)}).`
    : `O modelo tem ${result.triangles.toLocaleString("pt-BR")} triângulos e pode pesar no celular.`;
  if (
    !confirm(
      `${reason}\n\nSimplificar a malha? Isso reduz o número de triângulos e pode apagar detalhes finos da forma.`,
    )
  ) {
    if (tooBig)
      throw new Error(
        `${reason} Simplifique a malha ou reduza o modelo no programa de modelagem.`,
      );
    return result;
  }
  for (const ratio of [0.5, 0.25, 0.1]) {
    report(`Simplificando a malha (${Math.round(ratio * 100)}% dos vértices)…`);
    result = await optimize({
      simplify: ratio,
      maxTextureSize: tooBig ? 1024 : 2048,
    });
    if (
      result.file.size <= limit &&
      (tooBig || result.optimizedTriangles <= HEAVY_TRIANGLES)
    )
      return result;
  }
  if (result.file.size > limit)
    throw new Error(
      `Mesmo simplificado, o modelo ficou com ${megabytes(result.file.size)}. Reduza o modelo no programa de modelagem.`,
    );
  return result;
}
