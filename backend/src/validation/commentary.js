import { z } from 'zod';

export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createCommentarySchema = z.object({
  minute: z.number().int().nonnegative(),
  sequence: z.number().int().default(0),
  period: z.string().min(1).default('1H'),
  eventType: z.string().min(1).default('event'),
  actor: z.string().optional(),
  team: z.string().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sport: z.enum(['football', 'cricket']).optional(),
  status: z.enum(['scheduled', 'live', 'finished']).optional(),
});