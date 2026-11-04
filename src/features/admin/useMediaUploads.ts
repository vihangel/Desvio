import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { RecordDraft, StoredFile } from "../../domain/entities";
import type { MediaService, UploadSource } from "../../domain/media";
import { isSessionUrl } from "../../domain/mediaUrls";
import { megabytes, optimizeForUpload } from "./works/modelUpload";
import type { CollectionActions } from "./useCollectionActions";
import type { Notify } from "./useNotice";
import type { ConfirmRequest } from "./ui";
const PHOTO_SIZE = 1200;
// Files sent while editing. Session-only addresses are released as soon as
// nothing saved points at them.
export function useMediaUploads({
  draft,
  setDraft,
  mediaService,
  remote,
  actions,
  notify,
  confirm,
}: {
  draft: RecordDraft | null;
  setDraft: Dispatch<SetStateAction<RecordDraft | null>>;
  mediaService: MediaService;
  remote: boolean;
  actions: CollectionActions;
  notify: Notify;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
}) {
  const temporary = useRef(new Set<string>());
  const { savedMedia, withLock } = actions;
  const track = (src: string) => {
    if (isSessionUrl(src)) temporary.current.add(src);
  };
  const releaseUnsaved = () => {
    temporary.current.forEach((url) => {
      if (
        !savedMedia.current.some(
          (m) => m.src === url || m.narration?.src === url,
        )
      ) {
        mediaService.release(url);
        temporary.current.delete(url);
      }
    });
  };
  const release = useRef(releaseUnsaved);
  release.current = releaseUnsaved;
  useEffect(() => () => release.current(), []);
  const optimizeModel = async (file: File) => {
    const optimized = await optimizeForUpload(
      file,
      mediaService.modelLimit,
      (options) => mediaService.optimizeModel(file, options),
      (text) => notify(text),
      (body) =>
        confirm({
          title: "Simplificar a malha?",
          body,
          confirmLabel: "Simplificar",
          cancelLabel: "Não simplificar",
        }),
    );
    const summary = `Modelo otimizado: ${megabytes(file.size)} → ${megabytes(optimized.file.size)}${
      optimized.optimizedTriangles < optimized.triangles
        ? `, ${optimized.optimizedTriangles.toLocaleString("pt-BR")} triângulos`
        : ""
    }. `;
    notify(`${summary}Enviando…`);
    return { source: optimized.file as UploadSource, summary };
  };
  const upload = (file: File) =>
    withLock(async () => {
      if (!draft || draft.media.type === "video") return;
      const type = draft.media.type;
      let source: UploadSource = file;
      let summary = "";
      if (type === "model") ({ source, summary } = await optimizeModel(file));
      else notify(`Enviando “${file.name}”…`);
      const prepared = await mediaService.prepare(source, type);
      track(prepared.src);
      // Functional update: uploads take seconds and must not undo edits made
      // meanwhile, nor attach the file if the media type changed.
      setDraft((current) =>
        current && current.media.type === type
          ? { ...current, media: { ...current.media, ...prepared } }
          : current,
      );
      notify(
        summary +
          (remote
            ? "Arquivo enviado. Salve a obra para vinculá-lo."
            : type === "model"
              ? "Modelo 3D disponível apenas nesta sessão do navegador."
              : "Imagem preparada. Salve a obra."),
        "success",
      );
    }, "Falha no envio.");
  const uploadAudio = (file: File) =>
    withLock(async () => {
      notify(`Enviando “${file.name}”…`);
      const audio = await mediaService.prepare(file, "audio");
      track(audio.src);
      setDraft((current) =>
        current
          ? {
              ...current,
              media: {
                ...current.media,
                narration: {
                  ...audio,
                  credits: current.media.narration?.credits ?? "",
                  transcript: current.media.narration?.transcript ?? "",
                  authorized: false,
                },
              },
            }
          : current,
      );
      notify(
        "Áudio anexado. Registre os créditos e a autorização, depois salve.",
        "success",
      );
    }, "Falha ao enviar áudio.");
  // Uploads a downscaled photo and returns its stored reference.
  const uploadPhoto = (file: File) =>
    withLock(async (): Promise<StoredFile> => {
      notify("Preparando a foto…");
      const source = await mediaService.optimizeImage(file, PHOTO_SIZE);
      const { src, bucket, path } = await mediaService.prepare(source, "image");
      notify(
        "Foto enviada. Salve o perfil da pessoa artista para vinculá-la.",
        "success",
      );
      return { src, bucket, path };
    }, "Falha ao enviar a foto.");
  return { upload, uploadAudio, uploadPhoto, releaseUnsaved };
}
