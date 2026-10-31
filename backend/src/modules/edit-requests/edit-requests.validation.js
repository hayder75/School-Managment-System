const { z } = require('zod');

const createRequestSchema = z.object({
  body: z.object({
    exam_id: z.string().uuid(),
    class_id: z.string().uuid(),
    student_id: z.string().uuid().optional().nullable(),
    reason: z.string().min(3).max(1000),
  }),
});

const decideSchema = z.object({
  body: z.object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().max(1000).optional().nullable(),
  }),
});

module.exports = { createRequestSchema, decideSchema };
