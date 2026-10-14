export function validateGlb(bytes: ArrayBuffer) {
  if (bytes.byteLength < 20) throw new Error("Selecione um GLB 2.0 válido.");
  const view = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Selecione um GLB 2.0 válido.");
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20)
    throw new Error("Cabeçalho GLB inválido.");
  const json: unknown = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 20, length)),
  );
  if (!json || typeof json !== "object" || !("asset" in json))
    throw new Error("Conteúdo GLB inválido.");
  const payload = json as {
    buffers?: { uri?: string }[];
    images?: { uri?: string }[];
  };
  if (
    [...(payload.buffers ?? []), ...(payload.images ?? [])].some(
      (x) => x.uri && !x.uri.startsWith("data:"),
    )
  )
    throw new Error(
      "Exporte um GLB com texturas e buffers incorporados, sem arquivos externos.",
    );
}
export function validateImage(bytes: ArrayBuffer, type: string) {
  const b = new Uint8Array(bytes);
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...b.subarray(start, end));
  const valid =
    type === "image/png"
      ? b[0] === 137 && ascii(1, 4) === "PNG"
      : type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : type === "image/webp"
          ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
          : false;
  if (!valid)
    throw new Error(
      "O conteúdo não corresponde a uma imagem PNG, JPEG ou WebP.",
    );
}
export function validateModel(
  bytes: ArrayBuffer,
  name: string,
): import("./constants").ModelFormat {
  const format = name.toLowerCase().split(".").pop();
  if (format === "glb") {
    validateGlb(bytes);
    return format;
  }
  if (format === "stl") {
    if (
      bytes.byteLength >= 84 &&
      new DataView(bytes).getUint32(80, true) > 0 &&
      84 + new DataView(bytes).getUint32(80, true) * 50 === bytes.byteLength
    )
      return format;
    const text = new TextDecoder().decode(bytes);
    if (
      /^\s*solid\b/i.test(text) &&
      /facet\s+normal/i.test(text) &&
      /vertex\s+[-+\d.]/i.test(text) &&
      /endsolid/i.test(text)
    )
      return format;
  } else if (format === "obj") {
    const text = new TextDecoder().decode(bytes);
    if (
      /^v\s+[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+/m.test(text) &&
      /^f\s+\d+/m.test(text)
    )
      return format;
  }
  throw new Error(
    "Selecione GLB, STL ou OBJ válido. OBJ é exibido sem materiais externos.",
  );
}
export function validateAudio(bytes: ArrayBuffer, name: string) {
  const ext = name.toLowerCase().split(".").pop();
  const b = new Uint8Array(bytes);
  const tag = (start: number, end: number) =>
    String.fromCharCode(...b.subarray(start, end));
  const valid =
    ext === "mp3"
      ? tag(0, 3) === "ID3" || (b[0] === 255 && (b[1] & 224) === 224)
      : ext === "wav"
        ? tag(0, 4) === "RIFF" && tag(8, 12) === "WAVE"
        : ext === "ogg"
          ? tag(0, 4) === "OggS"
          : ext === "m4a"
            ? tag(4, 8) === "ftyp"
            : false;
  if (!valid) throw new Error("Selecione MP3, WAV, OGG ou M4A válido.");
  return {
    ext: ext!,
    mime: (
      {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
      } as Record<string, string>
    )[ext!],
  };
}
