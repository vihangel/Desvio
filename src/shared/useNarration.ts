import { mediaPlayback } from "./mediaPlayback";
import { useEffect, useState, useRef } from "react";
export function useNarration() {
  const token = useRef(crypto.randomUUID()).current;
  useEffect(
    () =>
      mediaPlayback.register(token, () => {
        window.speechSynthesis?.cancel();
        setSpeaking(false);
      }),
    [token],
  );
  const [speaking, setSpeaking] = useState(false);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      mediaPlayback.release(token);
    },
    [],
  );
  const toggle = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      mediaPlayback.release(token);
      return;
    }
    mediaPlayback.claim(token);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.onend = utterance.onerror = () => {
      setSpeaking(false);
      mediaPlayback.release(token);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };
  return { speaking, toggle };
}
