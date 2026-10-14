import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import YouTubeVideo from "../src/shared/YouTubeVideo";
import ArtistNarration from "../src/shared/ArtistNarration";
it("renders manual video controls without starting playback during render", () => {
  const html = renderToStaticMarkup(
    <YouTubeVideo
      url="https://www.youtube.com/watch?v=M7lc1UVf-VE"
      title="Obra de vídeo"
    />,
  );
  expect(html).toContain("Reproduzir");
  expect(html).toContain("Ativar som");
  expect(html).not.toContain("autoplay=1");
});
it("renders artist credits and transcription with no audio autoplay", () => {
  const html = renderToStaticMarkup(
    <ArtistNarration
      audio={{
        src: "https://example.com/voice.mp3",
        credits: "Voz da artista",
        transcript: "Relato sobre a obra",
        authorized: true,
      }}
    />,
  );
  expect(html).toContain("controls");
  expect(html).toContain('preload="none"');
  expect(html).toContain("Voz da artista");
  expect(html).toContain("Relato sobre a obra");
  expect(html).not.toContain("autoPlay");
});
