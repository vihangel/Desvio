import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ArtistNarration from "../src/shared/ArtistNarration";
import Header from "../src/shared/Header";
import {
  DEFAULT_PREFERENCES,
  applyPreferences,
  preferences,
} from "../src/shared/preferences";
import { validateCaptions } from "../src/domain/validation";
const vtt = "WEBVTT\n\n00:00.000 --> 00:02.500\nOlá, eu sou a artista.\n";
describe("navigation semantics", () => {
  it("uses real links with addresses and marks the current page", () => {
    const html = renderToStaticMarkup(<Header go={() => {}} current="about" />);
    for (const href of ["/", "/museu", "/acervo", "/artistas", "/sobre"])
      expect(html).toContain(`href="${href}"`);
    expect(html).toMatch(/href="\/sobre" aria-current="page"/);
    expect(html).toContain('aria-label="Acessibilidade"');
  });
});
describe("preferences", () => {
  it("start with sound off and can be reset", () => {
    expect(DEFAULT_PREFERENCES.sound).toBe(false);
    preferences.set({ textSize: "xlarge", highContrast: true });
    expect(preferences.get()).toMatchObject({
      textSize: "xlarge",
      highContrast: true,
    });
    preferences.reset();
    expect(preferences.get()).toEqual(DEFAULT_PREFERENCES);
  });
  it("are mirrored on the root element for the stylesheets", () => {
    const root = { dataset: {} as Record<string, string> } as HTMLElement;
    applyPreferences(
      { ...DEFAULT_PREFERENCES, textSize: "large", easyReading: true },
      root,
    );
    expect(root.dataset).toEqual({
      textSize: "large",
      contrast: "normal",
      reading: "easy",
    });
  });
});
describe("narration captions and transcript", () => {
  it("shows the transcript openly and offers captions when a VTT exists", () => {
    const html = renderToStaticMarkup(
      <ArtistNarration
        audio={{
          src: "https://example.com/voice.mp3",
          credits: "Artista",
          transcript: "Olá, eu sou a artista.",
          authorized: true,
          captions: vtt,
        }}
      />,
    );
    expect(html).toContain("<h4>Transcrição</h4>");
    expect(html).not.toContain("<details");
    expect(html).toContain('kind="captions"');
    expect(html).toContain('aria-pressed="true"');
  });
  it("accepts WebVTT and explains what is wrong otherwise", () => {
    expect(() => validateCaptions(vtt)).not.toThrow();
    expect(() =>
      validateCaptions("1\n00:00:01,000 --> 00:00:02,000\nSRT"),
    ).toThrow("WebVTT");
    expect(() => validateCaptions("WEBVTT\n\nsem tempos")).toThrow("tempo");
    expect(() => validateCaptions("WEBVTT\n" + "x".repeat(200_001))).toThrow(
      "200 KB",
    );
  });
});
