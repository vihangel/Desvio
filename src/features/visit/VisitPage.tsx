import type { GalleryNavigation } from "../../gallery/types";
import { lazy, Suspense, useState, useCallback } from "react";
import { Compass, Info } from "lucide-react";
import type { Artwork, ExhibitionRoom } from "../../domain/entities";
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
  const [focusedVideo, setFocusedVideo] = useState<Artwork | null>(null);
  const videoFocus = useCallback(
    (art: Artwork, focused: boolean) =>
      setFocusedVideo((current) =>
        focused ? art : current?.id === art.id ? null : current,
      ),
    [],
  );
  const [room, setRoom] = useState(0);
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
  const jump = (order: number) =>
    setJumpTo((j) => ({ room: order, version: j.version + 1 }));
  return (
    <div className="viewer">
      <Suspense fallback={<p role="status">Carregando museu…</p>}>
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
      <div className="room-picker" aria-label="Navegar entre salas">
        {rooms.map((r) => (
          <button
            key={r.id}
            className={room === r.order ? "active" : ""}
            onClick={() => jump(r.order)}
          >
            {r.order + 1} · {r.name}
          </button>
        ))}
      </div>
      <MobileJoystick disabled={disabled} />
      {focusedVideo && !disabled && (
        <div className="video-watch-action">
          <span>{focusedVideo.title}</span>
          <button onClick={() => onSelect(focusedVideo)}>
            Ampliar vídeo e ver detalhes
          </button>
        </div>
      )}
      {activeRoom && (
        <div className="scene-title">
          <small>
            SALA {activeRoom.order + 1} DE {rooms.length}
          </small>
          <h2>{activeRoom.name}</h2>
          <p>{activeRoom.subtitle}</p>
        </div>
      )}
      <span className="crosshair">+</span>
      <div className="help">
        <Info size={15} /> WASD ou setas para andar · Arraste para olhar ·
        Clique nas obras
      </div>
      <button
        className="guide-toggle"
        onClick={() => {
          setGuided(!guided);
          if (!guided && current) jump(current.room);
        }}
      >
        <Compass size={17} />
        {guided ? "Encerrar visita guiada" : "Iniciar visita guiada"}
      </button>
      {guided &&
        (current ? (
          <aside className="tour">
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
          <aside className="tour">
            <p>Nenhum registro disponível para a visita guiada.</p>
          </aside>
        ))}
    </div>
  );
}
