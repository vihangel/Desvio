import { useEffect } from "react";
// Federal government's Libras translator. Loaded only after the visitor turns
// it on in the accessibility panel; the script cannot be unloaded, so turning
// it off hides the widget.
const SCRIPT = "https://vlibras.gov.br/app/vlibras-plugin.js";
const APP = "https://vlibras.gov.br/app";
declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}
let loading: Promise<void> | undefined;
let started = false;
function load() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error("Não foi possível carregar o VLibras."));
    };
    document.body.append(script);
  });
  return loading;
}
export default function VLibras({
  enabled,
  onError,
}: {
  enabled: boolean;
  onError: (message: string) => void;
}) {
  useEffect(() => {
    if (!enabled || started) return;
    let active = true;
    load().then(
      () => {
        if (!active || started || !window.VLibras) return;
        started = true;
        new window.VLibras.Widget(APP);
        // The widget waits for window.onload, which already happened in an
        // app that loads it on demand.
        const onload = window.onload as ((e: Event) => void) | null;
        onload?.(new Event("load"));
      },
      (error: Error) => active && onError(error.message),
    );
    return () => {
      active = false;
    };
  }, [enabled, onError]);
  // Markup the plugin expects; kept mounted so the widget survives toggling.
  return (
    <div {...{ vw: "" }} className="enabled" hidden={!enabled}>
      <div {...{ "vw-access-button": "" }} className="active" />
      <div {...{ "vw-plugin-wrapper": "" }}>
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>
  );
}
