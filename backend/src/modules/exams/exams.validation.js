const { z } = require('zod');

const createExamSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(255),
      type: z.enum(['quiz', 'midterm', 'final', 'assignment', 'exam']).default('exam'),
      class_id: z.string().uuid().optional(),
      class_ids: z.array(z.string().uuid()).optional(),
      subject_id: z.string().uuid(),
      term_id: z.string().uuid().optional(),
      date: z.string().optional(),
      total_marks: z.number().positive().optional(),
      pass_marks: z.number().positive().optional(),
      description: z.string().optional(),
      mark_test_day: z.boolean().optional(),
    })
    .refine((v) => v.class_id || (v.class_ids && v.class_ids.length > 0), {
      message: 'class_id or class_ids is required',
    }),
});

const updateExamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    date: z.string().optional(),
    total_marks: z.number().positive().optional(),
    pass_marks: z.number().positive().optional(),
    description: z.string().optional(),
  }),
});

module.exports = { createExamSchema, updateExamSchema };
