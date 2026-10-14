import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { youtubeId } from "../domain/youtube";
import { mediaPlayback } from "./mediaPlayback";
import { loadYoutubeApi, type YoutubePlayer } from "./youtubeApi";
export default function YouTubeVideo({
  url,
  title,
  active,
  autoplay,
}: {
  url: string;
  title: string;
  // Scene preview: plays while the visitor faces the screen.
  active?: boolean;
  // Dialog: starts with sound right after the visitor opened it.
  autoplay?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YoutubePlayer | undefined>(undefined);
  const autoplayRef = useRef(autoplay);
  const token = useRef(crypto.randomUUID()).current;
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState("");
  const [manualPause, setManualPause] = useState(false);
  const owner = useSyncExternalStore(
    mediaPlayback.subscribe,
    mediaPlayback.current,
    mediaPlayback.current,
  );
  const videoId = youtubeId(url);
  useEffect(() => {
    if (!host.current || !videoId) return;
    let mounted = true;
    setReady(false);
    setError("");
    const node = document.createElement("div");
    host.current.append(node);
    const unregister = mediaPlayback.register(token, () => {
      player.current?.pauseVideo();
      setPlaying(false);
    });
    void loadYoutubeApi()
      .then((api) => {
        if (!mounted) return;
        player.current = new api.Player(node, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            origin: window.location.origin,
            playsinline: 1,
            controls: 1,
            autoplay: 0,
            rel: 0,
          },
          events: {
            onReady: (e) => {
              if (!mounted) return;
              if (autoplayRef.current) {
                mediaPlayback.claim(token);
                e.target.unMute();
                setMuted(false);
                e.target.playVideo();
              } else e.target.mute();
              setReady(true);
            },
            onStateChange: (e) => {
              if (!mounted) return;
              if (e.data === 1 && document.hidden) {
                player.current?.pauseVideo();
                return;
              }
              setPlaying(e.data === 1);
              if (e.data === 2 || e.data === 0) setManualPause(true);
              if (e.data === 1) mediaPlayback.claim(token);
              if (e.data === 0 || e.data === 2) mediaPlayback.release(token);
            },
            onError: () => {
              if (mounted) {
                setManualPause(true);
                mediaPlayback.release(token);
                setError(
                  "O vídeo não permite incorporação ou está indisponível.",
                );
              }
            },
            // Browsers may refuse sound without a recent gesture; keep the
            // video going silently and let the visitor turn the sound on.
            onAutoplayBlocked: () => {
              if (!mounted) return;
              player.current?.mute();
              setMuted(true);
              player.current?.playVideo();
            },
          },
        });
      })
      .catch((error) => {
        if (mounted) setError(error.message);
      });
    return () => {
      mounted = false;
      unregister();
      player.current?.destroy();
      player.current = undefined;
      node.remove();
    };
  }, [videoId, token]);
  useEffect(() => {
    if (!ready || active === undefined || document.hidden) return;
    if (!active) {
      player.current?.pauseVideo();
      mediaPlayback.release(token);
      setManualPause(false);
    } else if (!manualPause && (owner === null || owner === token)) {
      player.current?.unMute();
      setMuted(false);
      player.current?.playVideo();
    }
  }, [active, ready, owner, manualPause, token]);
  return (
    <div className="video-player" aria-label={title}>
      <div ref={host} className="youtube-host" />
      {error && <p role="status">{error}</p>}
      <div className="media-controls">
        <button
          disabled={!ready}
          onClick={() => {
            setError("");
            if (playing) {
              setManualPause(true);
              player.current?.pauseVideo();
              mediaPlayback.release(token);
            } else {
              mediaPlayback.claim(token);
              setManualPause(false);
              player.current?.playVideo();
            }
          }}
        >
          {playing ? "Pausar" : "Reproduzir"}
        </button>
        <button
          disabled={!ready}
          onClick={() => {
            mediaPlayback.claim(token);
            if (muted) player.current?.unMute();
            else player.current?.mute();
            setMuted(!muted);
          }}
        >
          {muted ? "Ativar som" : "Silenciar"}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Abrir no YouTube
        </a>
      </div>
    </div>
  );
}
