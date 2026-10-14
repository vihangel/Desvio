import { youtubeId } from "./youtube";
import type { CollectionSnapshot, RecordDraft } from "./entities";
import { roomSlots, presentationFor, slotSupports } from "./slots";
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
  if (media.type === "video" && !youtubeId(media.src ?? ""))
    throw new Error("Informe um link válido de vídeo do YouTube.");
  if (media.narration?.src && !safeSource(media.narration.src, true))
    throw new Error("Endereço de áudio inválido.");
  if (media.type === "image" && !media.src && !media.path)
    throw new Error("Selecione uma imagem.");
  if (
    media.type === "model" &&
    !media.src &&
    !media.path &&
    !(media.rights === "demo" && record.kind === "Demonstração técnica")
  )
    throw new Error(
      "Envie o arquivo 3D (GLB, STL ou OBJ) e aguarde a confirmação antes de salvar.",
    );
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
      (s) => s.id === placement.slotId && slotSupports(s, media.type),
    );
  const presentation = presentationFor(placement, media.type);
  if (
    (media.type !== "model" && presentation !== "frame") ||
    (media.type === "model" && presentation === "frame")
  )
    throw new Error("Apresentação incompatível com a mídia.");
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
  const [x, y, z] = placement.position;
  if (
    Math.abs(x) > 4.8 ||
    y < 0 ||
    y > 3.8 ||
    Math.abs(z + room!.order * 12) > 5.7 ||
    placement.scale.some((n) => n > 4)
  )
    throw new Error("Mantenha a obra dentro da sala e a escala entre 0 e 4.");
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
  const orders = snapshot.rooms.map((r) => r.order).sort((a, b) => a - b);
  if (!orders.length || orders.some((order, i) => order !== i))
    throw new Error("Ordem de salas inválida.");
  if (
    snapshot.rooms.some((r) =>
      r.artistIds?.some((id) => !snapshot.artists.some((a) => a.id === id)),
    )
  )
    throw new Error("Artista da sala inexistente.");
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
// Rules for a work that is (or goes) live; drafts may be incomplete.
export function validateLiveRecord(
  draft: RecordDraft,
  snapshot: CollectionSnapshot,
): void {
  const { record, media } = draft;
  if (record.status !== "published") return;
  validateRecord(draft, snapshot);
  if (!record.description.trim())
    throw new Error(`Para publicar “${record.title}”, preencha a descrição.`);
  if (
    media.narration &&
    (!media.narration.authorized ||
      !media.narration.credits.trim() ||
      !media.authorization?.trim())
  )
    throw new Error("Registre autorização e créditos da narração do artista.");
  if (media.narration?.src?.startsWith("blob:"))
    throw new Error(
      "Envie o áudio para armazenamento persistente antes de publicar.",
    );
  if (media.src?.startsWith("blob:"))
    throw new Error(
      "Envie o arquivo 3D para armazenamento persistente antes de publicar.",
    );
  if (
    media.rights === "licensed" &&
    (!media.authorization?.trim() || !media.attribution.trim())
  )
    throw new Error("Registre autorização e créditos da mídia licenciada.");
  if (media.rights === "reference" && !record.source)
    throw new Error("Registros de pesquisa precisam de fonte documental.");
}
export function validatePublication(snapshot: CollectionSnapshot): void {
  validateExhibition(snapshot);
  for (const placement of snapshot.placements) {
    const record = snapshot.records.find((r) => r.id === placement.recordId);
    const media = snapshot.media.find((m) => m.id === placement.mediaId);
    if (!record || !media)
      throw new Error("A exposição contém vínculos incompletos.");
    validateLiveRecord({ record, media, placement }, snapshot);
  }
}
