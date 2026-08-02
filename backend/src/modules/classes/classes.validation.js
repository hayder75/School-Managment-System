const { z } = require('zod');

const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Class name is required').max(100),
    grade_level: z.number().int().optional(),
    section: z.string().max(50).optional(),
    room: z.string().max(50).optional(),
    capacity: z.number().int().positive().optional(),
    academic_year_id: z.string().uuid().optional(),
    class_teacher_id: z.string().uuid().optional(),
    level_group: z.enum(['nursery', 'kg', 'primary', 'secondary']).optional(),
  }),
});

const updateClassSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    grade_level: z.number().int().optional(),
    section: z.string().max(50).optional(),
    room: z.string().max(50).optional(),
    capacity: z.number().int().positive().optional(),
    class_teacher_id: z.string().uuid().optional().nullable(),
    level_group: z.enum(['nursery', 'kg', 'primary', 'secondary']).optional(),
  }),
});

module.exports = { createClassSchema, updateClassSchema };
