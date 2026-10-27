export interface YoutubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}
interface YoutubeOptions {
  videoId: string;
  host: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: (e: { target: YoutubePlayer }) => void;
    onStateChange: (e: { data: number }) => void;
    onError: () => void;
    onAutoplayBlocked: () => void;
  };
}
interface YoutubeApi {
  Player: new (element: HTMLElement, options: YoutubeOptions) => YoutubePlayer;
}
declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let pending: Promise<YoutubeApi> | undefined;
export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise<YoutubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    const timer = window.setTimeout(() => {
      pending = undefined;
      script.remove();
      reject(new Error("Não foi possível carregar o YouTube."));
    }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT) resolve(window.YT);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      pending = undefined;
      script.remove();
      reject(new Error("Não foi possível carregar o YouTube."));
    };
    document.head.append(script);
  });
  return pending;
}
