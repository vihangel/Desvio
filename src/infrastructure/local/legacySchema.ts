import { z } from "zod";
import { MEDIA_TYPES } from "../../domain/constants";
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
