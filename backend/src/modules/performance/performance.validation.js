const { z } = require('zod');

const createCriteriaSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    weight: z.number().min(0).max(100).default(0),
    auto_source: z.enum(['attendance_punctuality', 'attendance', 'punctuality', 'student_results']).nullable().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

const updateCriteriaSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    weight: z.number().min(0).max(100).optional(),
    auto_source: z.enum(['attendance_punctuality', 'attendance', 'punctuality', 'student_results']).nullable().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

const saveMonthlySchema = z.object({
  params: z.object({ staffId: z.string().uuid() }),
  body: z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/),
    items: z.array(z.object({
      criteria_id: z.string().uuid(),
      value: z.number().min(0).max(100).nullable().optional(),
      comment: z.string().max(2000).nullable().optional(),
    })).max(100),
  }),
});

module.exports = { createCriteriaSchema, updateCriteriaSchema, saveMonthlySchema };
