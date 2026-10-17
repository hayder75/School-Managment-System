const { z } = require('zod');

const assignSubjectSchema = z.object({
  body: z.object({
    subject_id: z.string().uuid('Valid subject ID is required'),
    class_id: z.string().uuid('Valid class ID is required'),
    is_primary: z.boolean().optional().default(false),
  }),
});

const bulkAssignSchema = z.object({
  body: z.object({
    subject_ids: z.array(z.string().uuid()).min(1, 'Select at least one subject').max(100),
    class_ids: z.array(z.string().uuid()).min(1, 'Select at least one class').max(200),
  }),
});

module.exports = { assignSubjectSchema, bulkAssignSchema };
