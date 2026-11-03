import { z } from 'zod';

export const ClientLogSchema = z.object({
  level: z.enum(['error', 'warn', 'info']),
  message: z.string().min(1).max(1000),
  source: z.string().max(500).optional(),
  line: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional(),
  stack: z.string().max(5000).optional(),
  page: z.string().max(500).optional(),
  userAgent: z.string().max(300).optional(),
});

export type ClientLogInput = z.infer<typeof ClientLogSchema>;
