import type {
  Presentation,
  EDITORIAL_STATUSES,
  RIGHTS,
  MEDIA_TYPES,
  ModelFormat,
} from "./constants";
export type Id = string;
export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];
export type Rights = (typeof RIGHTS)[number];
export type MediaType = (typeof MEDIA_TYPES)[number];
export type Vector3 = [number, number, number];
// Stored file reference; `src` is resolved at read time like other media.
export interface StoredImage {
  src?: string;
  bucket?: string;
  path?: string;
}
export interface Artist {
  id: Id;
  name: string;
  location: string;
  bio: string;
  source: string;
  photo?: StoredImage;
}
export interface RecordCredit {
  artistId: Id;
  role: string;
}
export interface TechnicalDetails {
  technique: string;
  dimensions: string;
  materials: string;
}
export interface CollectionRecord {
  technicalDetails?: TechnicalDetails;
  id: Id;
  title: string;
  year: number | null;
  description: string;
  source?: string;
  kind: string;
  credits: RecordCredit[];
  creditNote: string;
  status: EditorialStatus;
  // Set when an artist saved the work; cleared when the curators publish it.
  reviewRequested?: boolean;
}
export interface ArtistAudio {
  src?: string;
  bucket?: string;
  path?: string;
  credits: string;
  transcript: string;
  authorized: boolean;
  // WebVTT text shown in sync with the audio (stored inline, small).
  captions?: string;
}
export interface MediaAsset {
  modelFormat?: ModelFormat;
  narration?: ArtistAudio;
  id: Id;
  recordId: Id;
  type: MediaType;
  // Local/demo assets use src; a remote adapter resolves bucket/path at read time.
  src?: string;
  bucket?: string;
  path?: string;
  alt: string;
  attribution: string;
  rights: Rights;
  authorization?: string;
}
export interface ExhibitionRoom {
  id: Id;
  name: string;
  subtitle: string;
  template: "corridor";
  order: number;
  wallSlots?: number;
  pedestalSlots?: number;
  artistIds?: Id[];
}
export interface Placement {
  id: Id;
  roomId: Id;
  recordId: Id;
  mediaId: Id;
  slotId: string;
  presentation?: Presentation;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}
export interface Exhibition {
  id: Id;
  title: string;
  subtitle: string;
  status: EditorialStatus;
  beginsAt: string;
  endsAt: string;
  notice: string;
}
export interface CollectionSnapshot {
  artists: Artist[];
  records: CollectionRecord[];
  media: MediaAsset[];
  rooms: ExhibitionRoom[];
  placements: Placement[];
  exhibition: Exhibition;
}
export interface CollectionState {
  version: 3;
  revision: number;
  draft: CollectionSnapshot;
  published: CollectionSnapshot;
}
// Projection used by catalog and 3D. Persistence never stores this flattened object.
export interface Artwork {
  technicalDetails?: TechnicalDetails;
  attribution: string;
  id: Id;
  title: string;
  author: string;
  artistIds: Id[];
  year: number | null;
  room: number;
  roomId: Id;
  type: MediaType;
  image?: string;
  modelUrl?: string;
  modelFormat?: ModelFormat;
  videoUrl?: string;
  narration?: ArtistAudio;
  description: string;
  source?: string;
  kind: string;
  rights: Rights;
  alt: string;
  placement: Placement;
}
export interface RecordDraft {
  record: CollectionRecord;
  media: MediaAsset;
  placement: Placement;
}
