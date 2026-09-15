const { z } = require('zod');

const levelSchema = z.object({
  level_group: z.enum(['nursery', 'kg', 'primary', 'secondary']).optional(),
  grade_level: z.number().int().optional(),
});

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subject name is required').max(255),
    code: z.string().max(50).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional().default(true),
    levels: z.array(levelSchema).optional(),
  }),
});

const updateSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    code: z.string().max(50).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    levels: z.array(levelSchema).optional(),
  }),
});

module.exports = { createSubjectSchema, updateSubjectSchema };
