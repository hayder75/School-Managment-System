const { z } = require('zod');

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    first_name: z.string().min(1, 'First name is required').max(100),
    last_name: z.string().min(1, 'Last name is required').max(100),
    phone: z.string().optional(),
    role: z.enum(['owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'support']),
    send_invite: z.boolean().optional().default(true),
    job_title: z.string().max(150).optional(),
    qualification: z.string().max(150).optional(),
    field_of_study: z.string().max(150).optional(),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    role: z.enum(['owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'support']).optional(),
    status: z.enum(['active', 'invited', 'suspended']).optional(),
    job_title: z.string().max(150).optional().nullable(),
    qualification: z.string().max(150).optional().nullable(),
    field_of_study: z.string().max(150).optional().nullable(),
  }),
});

module.exports = { createUserSchema, updateUserSchema };
