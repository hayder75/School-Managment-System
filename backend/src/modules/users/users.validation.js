const { z } = require('zod');

const baseUserFields = z.object({
  job_title: z.string().max(150).optional(),
  qualification: z.string().max(150).optional(),
  field_of_study: z.string().max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  section_count: z.number().int().min(0).optional(),
  periods_per_week: z.number().int().min(0).optional(),
  overtime_periods: z.number().int().min(0).optional().default(0),
  total_periods: z.number().int().min(0).optional(),
});

const createUserSchema = z.object({
  body: baseUserFields
    .extend({
      email: z.string().email('Valid email is required'),
      first_name: z.string().min(1, 'First name is required').max(100),
      last_name: z.string().min(1, 'Last name is required').max(100),
      phone: z.string().optional(),
      role: z.enum(['owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'support']),
      send_invite: z.boolean().optional().default(true),
    })
    .superRefine((data, ctx) => {
      if (data.role === 'teacher') {
        if (data.section_count == null) {
          ctx.addIssue({ code: 'custom', path: ['section_count'], message: 'Section count is required for teachers' });
        }
        if (data.periods_per_week == null) {
          ctx.addIssue({ code: 'custom', path: ['periods_per_week'], message: 'Weekly periods are required for teachers' });
        }
      }
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
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    section_count: z.number().int().min(0).optional().nullable(),
    periods_per_week: z.number().int().min(0).optional().nullable(),
    overtime_periods: z.number().int().min(0).optional().nullable(),
    total_periods: z.number().int().min(0).optional().nullable(),
  }),
});

module.exports = { createUserSchema, updateUserSchema };
