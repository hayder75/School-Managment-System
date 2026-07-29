const { z } = require('zod');

const createEntrySchema = z.object({
  body: z.object({
    class_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    teacher_id: z.string().uuid().optional().nullable(),
    day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
    room: z.string().max(50).optional(),
  }),
});

const updateEntrySchema = z.object({
  body: z.object({
    subject_id: z.string().uuid().optional(),
    teacher_id: z.string().uuid().optional().nullable(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    room: z.string().max(50).optional(),
  }),
});

module.exports = { createEntrySchema, updateEntrySchema };
