import { WebIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import {
  dedup,
  meshopt,
  prune,
  simplify,
  weld,
} from "@gltf-transform/functions";
import {
  MeshoptDecoder,
  MeshoptEncoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type {
  ModelOptimization,
  ModelOptimizationOptions,
  UploadSource,
} from "../../domain/media";
import { validateModel } from "../../domain/uploadValidation";
// Large originals are accepted because the stored file is the optimized one.
export const MODEL_INPUT_LIMIT = 150_000_000;
const TEXTURE_FORMATS = ["image/png", "image/jpeg", "image/webp"];
async function toGlb(bytes: ArrayBuffer, format: "stl" | "obj") {
  const object =
    format === "stl"
      ? new THREE.Mesh(
          new STLLoader().parse(bytes),
          new THREE.MeshStandardMaterial({ color: "#b67f5c", roughness: 0.65 }),
        )
      : new OBJLoader().parse(new TextDecoder().decode(bytes));
  if (object instanceof THREE.Mesh) object.geometry.computeVertexNormals();
  const result = await new GLTFExporter().parseAsync(object, { binary: true });
  if (!(result instanceof ArrayBuffer))
    throw new Error("Falha ao converter o modelo para GLB.");
  return new Uint8Array(result);
}
function countTriangles(document: Document) {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      if (primitive.getMode() !== 4) continue;
      const indices = primitive.getIndices();
      const position = primitive.getAttribute("POSITION");
      total += Math.floor(
        (indices?.getCount() ?? position?.getCount() ?? 0) / 3,
      );
    }
  return total;
}
async function encodeImage(canvas: OffscreenCanvas | HTMLCanvasElement) {
  const encode = (type: string) =>
    "convertToBlob" in canvas
      ? canvas.convertToBlob({ type, quality: 0.85 })
      : new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, type, 0.85),
        );
  // Browsers without a WebP encoder silently return PNG; JPEG is the fallback.
  const webp = await encode("image/webp");
  return webp?.type === "image/webp" ? webp : encode("image/jpeg");
}
// Textures usually account for most of a GLB. They are scaled down and
// re-encoded; a texture is only replaced when the result is smaller.
async function resizeTextures(document: Document, maxSize: number) {
  let usedWebp = false;
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    const mime = texture.getMimeType();
    if (!image || !TEXTURE_FORMATS.includes(mime)) continue;
    const bitmap = await createImageBitmap(
      new Blob([image as Uint8Array<ArrayBuffer>], { type: mime }),
    );
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(window.document.createElement("canvas"), {
            width,
            height,
          });
    const context = canvas.getContext("2d") as
      OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!context) {
      bitmap.close();
      continue;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await encodeImage(canvas);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength >= image.byteLength) continue;
    texture.setImage(bytes).setMimeType(blob.type);
    const uri = texture.getURI();
    if (uri)
      texture.setURI(
        uri.replace(/\.\w+$/, blob.type === "image/webp" ? ".webp" : ".jpg"),
      );
    if (blob.type === "image/webp") usedWebp = true;
  }
  if (usedWebp) document.createExtension(EXTTextureWebP).setRequired(true);
}
export async function optimizeModel(
  source: UploadSource,
  options: ModelOptimizationOptions = {},
): Promise<ModelOptimization> {
  if (source.size > MODEL_INPUT_LIMIT)
    throw new Error(
      `Arquivo acima de ${MODEL_INPUT_LIMIT / 1_000_000} MB. Reduza o modelo antes de enviar.`,
    );
  const original = await source.arrayBuffer();
  const format = validateModel(original, source.name);
  const glb =
    format === "glb" ? new Uint8Array(original) : await toGlb(original, format);
  await Promise.all([
    MeshoptEncoder.ready,
    MeshoptDecoder.ready,
    MeshoptSimplifier.ready,
  ]);
  const io = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "meshopt.encoder": MeshoptEncoder,
      "meshopt.decoder": MeshoptDecoder,
    });
  let document: Document;
  try {
    document = await io.readBinary(glb);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new Error(
      /draco/i.test(message)
        ? "Modelo com compressão Draco. Exporte o GLB sem Draco para que o Desvio otimize o arquivo."
        : "Não foi possível ler o modelo 3D.",
    );
  }
  const triangles = countTriangles(document);
  await document.transform(dedup(), prune(), weld());
  if (options.simplify && options.simplify < 1)
    await document.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: options.simplify,
        error: 0.01,
      }),
    );
  await resizeTextures(document, options.maxTextureSize ?? 2048);
  await document.transform(
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const optimized = await io.writeBinary(document);
  const bytes = optimized.slice().buffer as ArrayBuffer;
  return {
    file: {
      name: source.name.replace(/\.\w+$/, "") + ".glb",
      type: "model/gltf-binary",
      size: bytes.byteLength,
      arrayBuffer: async () => bytes,
    },
    originalSize: source.size,
    triangles,
    optimizedTriangles: countTriangles(document),
  };
}
