import type { Artist } from "../../../domain/entities";
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";
export default function Avatar({
  artist,
  size = 48,
}: {
  artist: Artist;
  size?: number;
}) {
  return artist.photo?.src ? (
    <img
      className="avatar"
      src={artist.photo.src}
      alt=""
      width={size}
      height={size}
    />
  ) : (
    <span
      className="avatar avatar-initials"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(artist.name)}
    </span>
  );
}
