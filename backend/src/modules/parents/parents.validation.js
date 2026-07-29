const { z } = require('zod');

const linkParentSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    parent_id: z.string().uuid(),
    relationship: z.enum(['father', 'mother', 'guardian', 'other']).default('guardian'),
    is_primary: z.boolean().default(false),
  }),
});

const updateLinkSchema = z.object({
  body: z.object({
    relationship: z.enum(['father', 'mother', 'guardian', 'other']).optional(),
    is_primary: z.boolean().optional(),
  }),
});

module.exports = { linkParentSchema, updateLinkSchema };
