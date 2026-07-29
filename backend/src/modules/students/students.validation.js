const { z } = require('zod');

const createStudentSchema = z.object({
  body: z.object({
    user_id: z.string().uuid(),
    class_id: z.string().uuid(),
    student_number: z.string().max(50).optional(),
    enrollment_date: z.string().optional(),
    emergency_contact: z.string().optional(),
    medical_info: z.record(z.any()).optional(),
  }),
});

const updateStudentSchema = z.object({
  body: z.object({
    class_id: z.string().uuid().optional(),
    student_number: z.string().max(50).optional(),
    status: z.enum(['active', 'transferred', 'dropped', 'graduated']).optional(),
    emergency_contact: z.string().optional(),
    medical_info: z.record(z.any()).optional(),
  }),
});

module.exports = { createStudentSchema, updateStudentSchema };
