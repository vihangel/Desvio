import { z } from "zod";
const id = z.string().uuid();
const status = z.enum(["draft", "in_review", "published", "archived"]);
const vector = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
const snapshot = z.object({
  artists: z.array(
    z.object({
      id,
      name: z.string(),
      location: z.string(),
      bio: z.string(),
      source: z.string(),
    }),
  ),
  records: z.array(
    z.object({
      id,
      title: z.string(),
      year: z.number().int().nullable(),
      description: z.string(),
      source: z.string().optional(),
      kind: z.string(),
      credits: z.array(z.object({ artistId: id, role: z.string() })),
      technicalDetails: z
        .object({
          technique: z.string(),
          dimensions: z.string(),
          materials: z.string(),
        })
        .optional(),
      creditNote: z.string(),
      status,
    }),
  ),
  media: z.array(
    z.object({
      id,
      recordId: id,
      type: z.enum(["image", "model"]),
      src: z.string().optional(),
      bucket: z.string().optional(),
      path: z.string().optional(),
      alt: z.string(),
      attribution: z.string(),
      rights: z.enum(["reference", "demo", "licensed", "preview"]),
      authorization: z.string().optional(),
    }),
  ),
  rooms: z
    .array(
      z.object({
        id,
        name: z.string(),
        subtitle: z.string(),
        template: z.literal("corridor"),
        order: z.number().int().min(0).max(2),
      }),
    )
    .length(3),
  placements: z.array(
    z.object({
      id,
      roomId: id,
      recordId: id,
      mediaId: id,
      slotId: z.string(),
      position: vector,
      rotation: vector,
      scale: vector,
    }),
  ),
  exhibition: z.object({
    id,
    title: z.string(),
    subtitle: z.string(),
    status,
    beginsAt: z.string(),
    endsAt: z.string(),
    notice: z.string(),
  }),
});
export const stateSchema = z.object({
  version: z.literal(3),
  revision: z.number().int().nonnegative(),
  draft: snapshot,
  published: snapshot,
});
export const legacySchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    author: z.string(),
    year: z.number().int().nullable(),
    room: z.number().int().min(0).max(2),
    type: z.enum(["image", "model"]),
    image: z.string().optional(),
    modelUrl: z.string().optional(),
    description: z.string(),
    source: z.string().optional(),
    kind: z.string().optional(),
    rights: z.enum(["reference", "demo", "licensed"]).optional(),
  }),
);
