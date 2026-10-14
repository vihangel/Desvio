import { useEffect, useRef, useState } from "react";
import type { ArtistAudio } from "../domain/entities";
import { mediaPlayback } from "./mediaPlayback";
export default function ArtistNarration({ audio }: { audio: ArtistAudio }) {
  const ref = useRef<HTMLAudioElement>(null);
  const token = useRef(crypto.randomUUID()).current;
  const [error, setError] = useState(false);
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
  return (
    <section className="artist-narration">
      <h3>Narração do artista</h3>
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
        />
      ) : (
        <p>Áudio indisponível. Reenvie o arquivo no editor.</p>
      )}
      {error && <p role="alert">Não foi possível reproduzir o áudio.</p>}
      <small>{audio.credits}</small>
      {audio.transcript && (
        <details>
          <summary>Transcrição do áudio</summary>
          <p>{audio.transcript}</p>
        </details>
      )}
    </section>
  );
}
