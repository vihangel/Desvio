import {
  MEDIA_TYPES,
  MODEL_FORMATS,
  RIGHTS,
  EDITORIAL_STATUSES,
  PRESENTATIONS,
  ROOM_LIMIT,
} from "../../domain/constants";
import { z } from "zod";
const id = z.string().uuid();
const status = z.enum(EDITORIAL_STATUSES);
const vector = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
export const snapshotSchema = z.object({
  artists: z.array(
    z.object({
      id,
      name: z.string(),
      location: z.string(),
      bio: z.string(),
      source: z.string(),
      photo: z
        .object({
          src: z.string().optional(),
          bucket: z.string().optional(),
          path: z.string().optional(),
        })
        .optional(),
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
      reviewRequested: z.boolean().optional(),
    }),
  ),
  media: z.array(
    z.object({
      id,
      recordId: id,
      type: z.enum(MEDIA_TYPES),
      modelFormat: z.enum(MODEL_FORMATS).optional(),
      narration: z
        .object({
          src: z.string().optional(),
          bucket: z.string().optional(),
          path: z.string().optional(),
          credits: z.string(),
          transcript: z.string(),
          authorized: z.boolean(),
        })
        .optional(),
      src: z.string().optional(),
      bucket: z.string().optional(),
      path: z.string().optional(),
      alt: z.string(),
      attribution: z.string(),
      rights: z.enum(RIGHTS),
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
        order: z
          .number()
          .int()
          .min(0)
          .max(ROOM_LIMIT - 1),
        wallSlots: z.number().int().min(1).max(6).optional(),
        pedestalSlots: z.number().int().min(0).max(4).optional(),
        artistIds: z.array(id).optional(),
      }),
    )
    .min(1)
    .max(ROOM_LIMIT),
  placements: z.array(
    z.object({
      id,
      roomId: id,
      recordId: id,
      mediaId: id,
      slotId: z.string(),
      presentation: z.enum(PRESENTATIONS).optional(),
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
  draft: snapshotSchema,
  published: snapshotSchema,
});
