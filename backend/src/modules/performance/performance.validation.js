const { z } = require('zod');

const createCriteriaSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    weight: z.number().min(0).max(100).default(0),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

const updateCriteriaSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    weight: z.number().min(0).max(100).optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

module.exports = { createCriteriaSchema, updateCriteriaSchema };
