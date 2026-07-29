const { z } = require('zod');

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name is required').max(255),
    code: z.string().max(50).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional().default(true),
  }),
});

const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    code: z.string().max(50).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

module.exports = { createSubjectSchema, updateSubjectSchema };
