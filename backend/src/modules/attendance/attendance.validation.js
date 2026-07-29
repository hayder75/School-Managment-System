const { z } = require('zod');

const markAttendanceSchema = z.object({
  body: z.object({
    date: z.string().min(1, 'Date is required'),
    records: z.array(z.object({
      student_id: z.string().uuid(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      remark: z.string().optional(),
    })).min(1, 'At least one student record required'),
  }),
});

module.exports = { markAttendanceSchema };
