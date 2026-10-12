export type Id = string;
export type EditorialStatus = "draft" | "in_review" | "published" | "archived";
export type Rights = "reference" | "demo" | "licensed" | "preview";
export type Vector3 = [number, number, number];
export interface Artist {
  id: Id;
  name: string;
  location: string;
  bio: string;
  source: string;
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
}
export interface MediaAsset {
  id: Id;
  recordId: Id;
  type: "image" | "model";
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
}
export interface Placement {
  id: Id;
  roomId: Id;
  recordId: Id;
  mediaId: Id;
  slotId: string;
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
  type: "image" | "model";
  image?: string;
  modelUrl?: string;
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
