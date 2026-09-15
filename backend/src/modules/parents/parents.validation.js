const { z } = require('zod');

const linkParentSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    parent_id: z.string().uuid(),
    relationship: z.enum(['father', 'mother', 'guardian', 'other']).default('guardian'),
    is_primary: z.boolean().default(false),
    education_level: z.string().max(150).optional(),
  }),
});

const updateLinkSchema = z.object({
  body: z.object({
    relationship: z.enum(['father', 'mother', 'guardian', 'other']).optional(),
    is_primary: z.boolean().optional(),
    education_level: z.string().max(150).optional(),
  }),
});

const updateParentSchema = z.object({
  body: z.object({
    first_name: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().max(255).optional(),
  }),
});

module.exports = { linkParentSchema, updateLinkSchema, updateParentSchema };
