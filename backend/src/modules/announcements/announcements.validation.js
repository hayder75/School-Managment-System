const { z } = require('zod');

const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    audience: z.enum(['all', 'teachers', 'students', 'parents', 'class']).default('all'),
    class_id: z.string().uuid().nullable().optional(),
    is_published: z.boolean().default(true),
  }),
});

const updateAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    audience: z.enum(['all', 'teachers', 'students', 'parents', 'class']).optional(),
    class_id: z.string().uuid().nullable().optional(),
    is_published: z.boolean().optional(),
  }),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
