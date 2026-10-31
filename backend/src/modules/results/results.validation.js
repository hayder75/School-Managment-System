const { z } = require('zod');

const submitSchema = z.object({
  body: z.object({
    exam_id: z.string().uuid(),
    class_id: z.string().uuid(),
  }),
});

const reviewSchema = z.object({
  body: z.object({
    decision: z.enum(['approve', 'return']),
    comment: z.string().max(2000).optional().nullable(),
  }),
});

const commentSchema = z.object({
  body: z.object({
    comment: z.string().min(1).max(2000),
  }),
});

module.exports = { submitSchema, reviewSchema, commentSchema };
