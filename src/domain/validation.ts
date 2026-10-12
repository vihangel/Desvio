import type { CollectionSnapshot, RecordDraft } from "./entities";
import { roomSlots } from "./slots";
export function safeSource(value: string, allowLocal = false): boolean {
  if (
    allowLocal &&
    (/^\/(?!\/)/.test(value) ||
      /^blob:/.test(value) ||
      /^data:image\/(png|jpeg|webp);base64,/.test(value))
  )
    return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
export function validateRecord(
  draft: RecordDraft,
  snapshot: CollectionSnapshot,
): void {
  const { record, media, placement } = draft;
  if (!record.title.trim()) throw new Error("Informe um título.");
  if (
    record.year !== null &&
    (!Number.isInteger(record.year) || record.year < 0 || record.year > 9999)
  )
    throw new Error("Ano inválido.");
  if (!record.credits.length && !record.creditNote.trim())
    throw new Error("Informe a autoria.");
  if (
    record.credits.some(
      (c) => !snapshot.artists.some((a) => a.id === c.artistId),
    )
  )
    throw new Error("Artista inexistente.");
  if (record.source && !safeSource(record.source))
    throw new Error("A fonte deve ser uma URL HTTP ou HTTPS.");
  if (media.src && !safeSource(media.src, true))
    throw new Error("Endereço de mídia inválido.");
  if (media.type === "image" && !media.src && !media.path)
    throw new Error("Selecione uma imagem.");
  if (media.type === "image" && !media.alt.trim())
    throw new Error("Descreva a imagem para acessibilidade.");
  if (
    media.recordId !== record.id ||
    placement.recordId !== record.id ||
    placement.mediaId !== media.id
  )
    throw new Error("Vínculos de mídia inválidos.");
  const room = snapshot.rooms.find((r) => r.id === placement.roomId);
  const slot =
    room &&
    roomSlots(room).find(
      (s) => s.id === placement.slotId && s.type === media.type,
    );
  if (!slot) throw new Error("Escolha um slot compatível com a mídia.");
  if (
    snapshot.placements.some(
      (p) =>
        p.recordId !== record.id &&
        p.roomId === placement.roomId &&
        p.slotId === placement.slotId,
    )
  )
    throw new Error("Este slot já está ocupado.");
  if (
    [...placement.position, ...placement.rotation, ...placement.scale].some(
      (n) => !Number.isFinite(n),
    ) ||
    placement.scale.some((n) => n <= 0)
  )
    throw new Error("Posicionamento inválido.");
}
export function validateExhibition(snapshot: CollectionSnapshot): void {
  const { exhibition } = snapshot;
  if (!exhibition.title.trim())
    throw new Error("Informe o título da exposição.");
  const dates = [exhibition.beginsAt, exhibition.endsAt];
  if (
    dates.some(
      (d) =>
        d &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(d) ||
          !Number.isFinite(Date.parse(d)) ||
          new Date(d).toISOString().slice(0, 10) !== d),
    )
  )
    throw new Error("Data inválida.");
  if (
    exhibition.beginsAt &&
    exhibition.endsAt &&
    exhibition.endsAt < exhibition.beginsAt
  )
    throw new Error("O encerramento deve ser posterior ao início.");
}
export function validatePublication(snapshot: CollectionSnapshot): void {
  validateExhibition(snapshot);
  if (!snapshot.placements.length)
    throw new Error("Adicione ao menos um registro à exposição.");
  for (const placement of snapshot.placements) {
    const record = snapshot.records.find((r) => r.id === placement.recordId);
    const media = snapshot.media.find((m) => m.id === placement.mediaId);
    if (!record || !media)
      throw new Error("A exposição contém vínculos incompletos.");
    if (media.rights === "preview")
      throw new Error(
        "Imagens de prévia local não podem ser publicadas. Registre uma autorização antes de integrar ao acervo.",
      );
    validateRecord({ record, media, placement }, snapshot);
    if (!record.description.trim())
      throw new Error(`Complete a descrição de “${record.title}”.`);
    if (media.src?.startsWith("blob:"))
      throw new Error(
        "Envie o GLB para armazenamento persistente antes de publicar.",
      );
    if (
      media.rights === "licensed" &&
      (!media.authorization?.trim() || !media.attribution.trim())
    )
      throw new Error("Registre autorização e créditos da mídia licenciada.");
    if (media.rights === "reference" && !record.source)
      throw new Error("Registros de pesquisa precisam de fonte documental.");
  }
}
