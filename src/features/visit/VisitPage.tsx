import type { GalleryNavigation } from "../../gallery/types";
import { lazy, Suspense, useState, useCallback } from "react";
import { Compass, Info, List, Volume2, VolumeX } from "lucide-react";
import type { Artwork, ExhibitionRoom } from "../../domain/entities";
import { preferences, usePreferences } from "../../shared/preferences";
import MobileJoystick from "./MobileJoystick";
const Gallery = lazy(() => import("../../gallery/Gallery"));
export default function VisitPage({
  works,
  rooms,
  onSelect,
  disabled,
  initialGuided,
  initialWorkId,
}: {
  works: Artwork[];
  rooms: ExhibitionRoom[];
  onSelect: (art: Artwork) => void;
  disabled: boolean;
  initialGuided: boolean;
  initialWorkId?: string;
}) {
  const { sound } = usePreferences();
  const [focusedVideo, setFocusedVideo] = useState<Artwork | null>(null);
  const videoFocus = useCallback(
    (art: Artwork, focused: boolean) =>
      setFocusedVideo((current) =>
        focused ? art : current?.id === art.id ? null : current,
      ),
    [],
  );
  const [room, setRoom] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<GalleryNavigation>(() => {
    const work = works.find((w) => w.id === initialWorkId);
    return { room: work?.room ?? 0, version: 0, focus: work?.placement };
  });
  const [guided, setGuided] = useState(initialGuided);
  const [stop, setStop] = useState(0);
  const tour = works.filter((w) => w.rights !== "demo");
  const index = tour.length ? stop % tour.length : 0;
  const current = tour[index];
  const activeRoom = rooms.find((r) => r.order === room) ?? rooms[0];
  const roomWorks = works.filter((w) => w.roomId === activeRoom?.id);
  const jump = (order: number) =>
    setJumpTo((j) => ({ room: order, version: j.version + 1 }));
  return (
    <main className="viewer" aria-labelledby="visit-title">
      <h1 id="visit-title" className="sr-only">
        Museu 3D
      </h1>
      {/* The 3D scene is visual only; every work is also reachable through
          "Obras desta sala" and the room menu, which screen readers can use. */}
      <div className="viewer-scene" aria-hidden="true">
        <Suspense fallback={<p>Carregando museu…</p>}>
          <Gallery
            works={works}
            rooms={rooms}
            jumpTo={jumpTo}
            onSelect={onSelect}
            onRoom={setRoom}
            onVideoFocus={videoFocus}
            enabled={!disabled}
          />
        </Suspense>
      </div>
      <p className="sr-only" aria-live="polite">
        {activeRoom &&
          `Sala ${activeRoom.order + 1} de ${rooms.length}: ${activeRoom.name}. ${roomWorks.length} obra(s).`}
      </p>
      {activeRoom && (
        <div className="scene-title">
          <small>
            SALA {activeRoom.order + 1} DE {rooms.length}
          </small>
          <h2>{activeRoom.name}</h2>
          <p>{activeRoom.subtitle}</p>
        </div>
      )}
      <nav className="room-picker" aria-label="Salas">
        {rooms.map((r) => (
          <button
            key={r.id}
            className={room === r.order ? "active" : ""}
            aria-current={room === r.order ? "location" : undefined}
            onClick={() => jump(r.order)}
          >
            {r.order + 1} · {r.name}
          </button>
        ))}
      </nav>
      <MobileJoystick disabled={disabled} />
      {focusedVideo && !disabled && (
        <div className="video-watch-action">
          <span>{focusedVideo.title}</span>
          <button onClick={() => onSelect(focusedVideo)}>
            Ampliar vídeo e ver detalhes
          </button>
        </div>
      )}
      <div className="viewer-tools">
        <button
          className="sound-toggle"
          aria-pressed={sound}
          onClick={() => preferences.set({ sound: !sound })}
        >
          {sound ? (
            <Volume2 size={18} aria-hidden="true" />
          ) : (
            <VolumeX size={18} aria-hidden="true" />
          )}
          {sound ? "Som ligado" : "Som desligado"}
        </button>
        <div className="room-works">
          <button
            aria-expanded={listOpen}
            aria-controls="room-works-list"
            onClick={() => setListOpen(!listOpen)}
          >
            <List size={18} aria-hidden="true" />
            Obras desta sala ({roomWorks.length})
          </button>
          {listOpen && (
            <ul id="room-works-list">
              {roomWorks.map((w) => (
                <li key={w.id}>
                  <button onClick={() => onSelect(w)}>
                    <b>{w.title}</b>
                    <small>
                      {[w.author, w.kind].filter(Boolean).join(" · ")}
                    </small>
                  </button>
                </li>
              ))}
              {!roomWorks.length && <li>Esta sala ainda não tem obras.</li>}
            </ul>
          )}
        </div>
      </div>
      <span className="crosshair" aria-hidden="true">
        +
      </span>
      <p className="help">
        <Info size={15} aria-hidden="true" /> WASD ou setas para andar · Arraste
        para olhar · Clique nas obras ou use “Obras desta sala”
      </p>
      <button
        className="guide-toggle"
        aria-pressed={guided}
        onClick={() => {
          setGuided(!guided);
          if (!guided && current) jump(current.room);
        }}
      >
        <Compass size={17} aria-hidden="true" />
        {guided ? "Encerrar visita guiada" : "Iniciar visita guiada"}
      </button>
      {guided &&
        (current ? (
          <aside className="tour" aria-label="Visita guiada">
            <small>
              VISITA GUIADA · {index + 1}/{tour.length}
            </small>
            <h3>{current.title}</h3>
            <p>{current.author}</p>
            <div className="actions">
              <button onClick={() => onSelect(current)}>Ver registro</button>
              <button
                onClick={() => {
                  const next = (index + 1) % tour.length;
                  setStop(next);
                  jump(tour[next].room);
                }}
              >
                Próxima →
              </button>
            </div>
          </aside>
        ) : (
          <aside className="tour" aria-label="Visita guiada">
            <p>Nenhum registro disponível para a visita guiada.</p>
          </aside>
        ))}
    </main>
  );
}
