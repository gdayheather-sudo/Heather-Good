import { z } from 'zod';

// The shape Claude returns from the SOP-structuring prompt.
// Kept in sync with lib/ai/prompt-sop-structuring.mjs.

export const StructuredStepSchema = z.object({
  position: z.number().int().positive(),
  title: z.string().min(1).max(80).nullable(),
  content: z.string().min(1),
  note: z.string().nullable(),
  audio_start_seconds: z.number().nonnegative().nullable(),
  audio_end_seconds: z.number().nonnegative().nullable(),
});

export const StructuredSopSchema = z.object({
  title: z.string().min(1).max(80),
  purpose: z.string().nullable(),
  prerequisites: z.string().nullable(),
  estimated_minutes: z.number().int().positive().nullable(),
  steps: z.array(StructuredStepSchema).min(1),
});

export const InsufficientContentSchema = z.object({
  error: z.literal('insufficient_content'),
  reason: z.string(),
});

export const StructuringResultSchema = z.union([
  StructuredSopSchema,
  InsufficientContentSchema,
]);

export type StructuredSop = z.infer<typeof StructuredSopSchema>;
export type StructuredStep = z.infer<typeof StructuredStepSchema>;
export type InsufficientContent = z.infer<typeof InsufficientContentSchema>;
export type StructuringResult = z.infer<typeof StructuringResultSchema>;

export function isInsufficientContent(
  result: StructuringResult,
): result is InsufficientContent {
  return 'error' in result && result.error === 'insufficient_content';
}
