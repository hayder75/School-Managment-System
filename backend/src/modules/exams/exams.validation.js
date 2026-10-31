const { z } = require('zod');

const createExamSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(255),
      // Free-form now: assessment types are managed per tenant.
      type: z.string().min(1).max(80).default('exam'),
      class_id: z.string().uuid().optional(),
      class_ids: z.array(z.string().uuid()).optional(),
      subject_id: z.string().uuid(),
      term_id: z.string().uuid().optional().nullable(),
      date: z.string().optional().nullable(),
      total_marks: z.number().positive().optional().nullable(),
      pass_marks: z.number().nonnegative().optional().nullable(),
      description: z.string().optional().nullable(),
      mark_test_day: z.boolean().optional(),
    })
    .refine((v) => v.class_id || (v.class_ids && v.class_ids.length > 0), {
      message: 'class_id or class_ids is required',
    }),
});

const updateExamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.string().min(1).max(80).optional(),
    class_id: z.string().uuid().optional().nullable(),
    class_ids: z.array(z.string().uuid()).optional(),
    subject_id: z.string().uuid().optional(),
    term_id: z.string().uuid().optional().nullable(),
    date: z.string().optional().nullable(),
    total_marks: z.number().positive().optional().nullable(),
    pass_marks: z.number().nonnegative().optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

module.exports = { createExamSchema, updateExamSchema };
