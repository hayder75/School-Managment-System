const { z } = require('zod');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const markAttendanceSchema = z.object({
  body: z.object({
    date: dateSchema,
    records: z.array(z.object({
      student_id: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      remark: z.string().optional(),
    })).min(1, 'At least one student record required'),
  }),
});

module.exports = { markAttendanceSchema };
