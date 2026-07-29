const { z } = require('zod');

const createExamSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['quiz', 'midterm', 'final', 'assignment', 'exam']).default('exam'),
    class_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    term_id: z.string().uuid().optional(),
    date: z.string().optional(),
    total_marks: z.number().positive().optional(),
    pass_marks: z.number().positive().optional(),
    description: z.string().optional(),
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
