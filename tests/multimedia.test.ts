import { expect, it } from "vitest";
import { youtubeId } from "../src/domain/youtube";
import { PlaybackCoordinator } from "../src/shared/mediaPlayback";
import { validateModel, validateAudio } from "../src/domain/uploadValidation";
import { createSeed } from "../src/infrastructure/local/seed";
import { placeRecordDraft } from "../src/domain/mounting";
import { selectRecordDraft } from "../src/domain/selectors";
import { validateRecord, validatePublication } from "../src/domain/validation";
it("accepts canonical YouTube links and rejects arbitrary iframe sources", () => {
  expect(youtubeId("https://youtu.be/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
  expect(youtubeId("https://www.youtube.com/watch?v=M7lc1UVf-VE&t=3")).toBe(
    "M7lc1UVf-VE",
  );
  expect(
    youtubeId("https://youtube.com.evil.example/watch?v=M7lc1UVf-VE"),
  ).toBeNull();
  expect(youtubeId("javascript:alert(1)")).toBeNull();
});
it("switches playback ownership without overlapping sources", () => {
  const player = new PlaybackCoordinator();
  const paused: string[] = [];
  player.register("video", () => paused.push("video"));
  const unregister = player.register("audio", () => paused.push("audio"));
  player.claim("video");
  player.claim("audio");
  expect(paused).toEqual(["video"]);
  expect(player.current()).toBe("audio");
  player.release("video");
  expect(player.current()).toBe("audio");
  unregister();
  expect(player.current()).toBeNull();
});
it("validates STL, OBJ and recorded audio by content", () => {
  const ascii = new TextEncoder().encode(
    "solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid",
  );
  expect(validateModel(ascii.buffer, "test.stl")).toBe("stl");
  expect(
    validateModel(
      new TextEncoder().encode("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3").buffer,
      "test.obj",
    ),
  ).toBe("obj");
  expect(() => validateModel(new ArrayBuffer(5), "bad.stl")).toThrow();
  expect(
    validateAudio(new TextEncoder().encode("ID3somebytes").buffer, "voice.mp3")
      .mime,
  ).toBe("audio/mpeg");
});
it("uses wall positions for video and requires voice authorization for publication", () => {
  const state = createSeed();
  const draft = placeRecordDraft(
    selectRecordDraft(state.draft, state.draft.records[0].id),
    state.draft,
    state.draft.rooms[0].id,
    state.draft.placements[0].slotId,
    "video",
  );
  draft.media.src = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
  expect(() => validateRecord(draft, state.draft)).not.toThrow();
  state.draft.media[0].narration = {
    src: "https://example.com/voice.mp3",
    credits: "Artista",
    transcript: "",
    authorized: false,
  };
  expect(() => validatePublication(state.draft)).toThrow("narração");
});
it("saves session GLB and YouTube edits into the draft shown by the admin preview", async () => {
  const { LocalCollectionRepository } =
    await import("../src/infrastructure/local/LocalCollectionRepository");
  const { selectArtworks } = await import("../src/domain/selectors");
  const disk = new Map<string, string>();
  const repo = new LocalCollectionRepository({
    getItem: (k) => disk.get(k) ?? null,
    setItem: (k, v) => {
      disk.set(k, v);
    },
  });
  let state = await repo.load();
  let video = selectRecordDraft(state.draft, state.draft.records[0].id);
  video = placeRecordDraft(
    video,
    state.draft,
    video.placement.roomId,
    video.placement.slotId,
    "video",
  );
  video.media.src = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
  video.record.status = "draft";
  state = await repo.saveRecord(video, state.revision);
  const model = selectRecordDraft(state.draft, state.draft.records[6].id);
  model.media.src = "blob:test-session-model";
  model.media.modelFormat = "glb";
  model.record.status = "draft";
  state = await repo.saveRecord(model, state.revision);
  const loaded = await repo.load();
  const works = selectArtworks(loaded.draft);
  expect(works.find((w) => w.id === video.record.id)?.videoUrl).toBe(
    video.media.src,
  );
  expect(works.find((w) => w.id === model.record.id)?.modelUrl).toBe(
    model.media.src,
  );
  // Drafts stay off the public site.
  expect(
    selectArtworks(loaded.published).find((w) => w.id === video.record.id),
  ).toBeUndefined();
});
