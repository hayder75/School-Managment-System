const { z } = require('zod');

const assignSubjectSchema = z.object({
  body: z.object({
    subject_id: z.string().uuid('Valid subject ID is required'),
    class_id: z.string().uuid('Valid class ID is required'),
    is_primary: z.boolean().optional().default(false),
  }),
});

module.exports = { assignSubjectSchema };
