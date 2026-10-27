import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, CaptionsOff } from "lucide-react";
import type { ArtistAudio } from "../domain/entities";
import { mediaPlayback } from "./mediaPlayback";
// Artist's voice with an always-visible transcript and, when the curators
// added a WebVTT file, captions shown in sync while the audio plays.
export default function ArtistNarration({ audio }: { audio: ArtistAudio }) {
  const ref = useRef<HTMLAudioElement>(null);
  const token = useRef(crypto.randomUUID()).current;
  const [error, setError] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [cue, setCue] = useState("");
  const captionsUrl = useMemo(
    () =>
      audio.captions && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(new Blob([audio.captions], { type: "text/vtt" }))
        : undefined,
    [audio.captions],
  );
  useEffect(
    () => () => {
      if (captionsUrl) URL.revokeObjectURL(captionsUrl);
    },
    [captionsUrl],
  );
  useEffect(
    () => mediaPlayback.register(token, () => ref.current?.pause()),
    [token],
  );
  useEffect(
    () => () => {
      ref.current?.pause();
      mediaPlayback.release(token);
    },
    [token],
  );
  // Audio elements do not draw captions; read the active cue and show it.
  useEffect(() => {
    const track = ref.current?.textTracks[0];
    if (!track) return;
    track.mode = showCaptions ? "hidden" : "disabled";
    const update = () =>
      setCue(
        Array.from(track.activeCues ?? [])
          .map((c) => (c as VTTCue).text)
          .join("\n"),
      );
    track.addEventListener("cuechange", update);
    update();
    return () => track.removeEventListener("cuechange", update);
  }, [showCaptions, captionsUrl]);
  return (
    <section className="artist-narration" aria-labelledby={`${token}-title`}>
      <h3 id={`${token}-title`}>Narração da pessoa artista</h3>
      {audio.src ? (
        <audio
          ref={ref}
          controls
          preload="none"
          src={audio.src}
          onPlay={() => mediaPlayback.claim(token)}
          onPause={() => mediaPlayback.release(token)}
          onEnded={() => mediaPlayback.release(token)}
          onError={() => {
            setError(true);
            mediaPlayback.release(token);
          }}
        >
          {captionsUrl && (
            <track
              kind="captions"
              srcLang="pt"
              label="Português"
              src={captionsUrl}
              default
            />
          )}
        </audio>
      ) : (
        <p>Áudio indisponível no momento.</p>
      )}
      {error && <p role="alert">Não foi possível reproduzir o áudio.</p>}
      {captionsUrl && (
        <>
          <button
            className="captions-toggle"
            aria-pressed={showCaptions}
            onClick={() => setShowCaptions(!showCaptions)}
          >
            {showCaptions ? (
              <Captions size={18} aria-hidden="true" />
            ) : (
              <CaptionsOff size={18} aria-hidden="true" />
            )}
            Legendas
          </button>
          {showCaptions && (
            // Visual captions; screen readers get the full transcript below.
            <p className="narration-caption" aria-hidden="true">
              {cue || " "}
            </p>
          )}
        </>
      )}
      {audio.credits && <small>Voz: {audio.credits}</small>}
      {audio.transcript && (
        <div className="narration-transcript">
          <h4>Transcrição</h4>
          <p>{audio.transcript}</p>
        </div>
      )}
    </section>
  );
}
