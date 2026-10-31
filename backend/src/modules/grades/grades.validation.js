const { z } = require('zod');

const enterGradesSchema = z.object({
  body: z.object({
    grades: z.array(z.object({
      student_id: z.string().uuid(),
      marks_obtained: z.number().min(0).optional().nullable(),
      grade_letter: z.string().max(5).optional().nullable(),
      remarks: z.string().optional().nullable(),
    })).min(1),
  }),
});

const lockGradesSchema = z.object({
  body: z.object({
    lock: z.boolean(),
  }),
});

const draftSchema = z.object({
  body: z.object({
    payload: z.object({
      marks: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
    }).passthrough(),
  }),
});

module.exports = { enterGradesSchema, lockGradesSchema, draftSchema };
