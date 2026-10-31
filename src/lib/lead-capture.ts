import { z } from "zod";

export const leadCaptureSchema = z.object({
  email: z.string().trim().max(320).email().transform((value) => value.toLowerCase()),
  website: z.string().max(1_000).optional().default(""),
});

export function parseLeadCapture(value: unknown) {
  return leadCaptureSchema.safeParse(value);
}
