const { z } = require('zod');

const createTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    code: z.string().max(50).optional(),
    default_total_marks: z.number().nonnegative().optional().nullable(),
    default_pass_marks: z.number().nonnegative().optional().nullable(),
    counts_toward_report: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

const updateTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).optional(),
    default_total_marks: z.number().nonnegative().optional().nullable(),
    default_pass_marks: z.number().nonnegative().optional().nullable(),
    counts_toward_report: z.boolean().optional(),
    sort_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
  }),
});

module.exports = { createTypeSchema, updateTypeSchema };
