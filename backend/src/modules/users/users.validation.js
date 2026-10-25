const { z } = require('zod');

const optionalString = z.string().max(150).nullable().optional();
const optionalInt = z.number().int().min(0).nullable().optional();

const baseUserFields = z.object({
  job_title: optionalString,
  qualification: optionalString,
  field_of_study: optionalString,
  gender: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(['male', 'female', 'other']).optional()
  ),
  section_count: optionalInt,
  periods_per_week: optionalInt,
  overtime_periods: optionalInt,
  total_periods: optionalInt,
});

const createUserSchema = z.object({
  body: baseUserFields
    .extend({
      email: z.string().email('Valid email is required'),
      username: z.string().max(50).optional(),
      first_name: z.string().min(1, 'First name is required').max(100),
      last_name: z.string().min(1, 'Last name is required').max(100),
      phone: z.string().optional().nullable(),
      role: z.enum(['owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'support', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'general_services', 'shift_coordinator', 'accountant', 'security_head', 'librarian', 'face_attendance']),
      password: z.string().min(4).max(100).optional(),
      send_invite: z.boolean().optional().default(false),
      status: z.enum(['active', 'invited', 'suspended']).optional(),
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
    username: z.string().max(50).optional(),
    phone: z.string().optional().nullable(),
    role: z.enum(['owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'support', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'general_services', 'shift_coordinator', 'accountant', 'security_head', 'librarian', 'face_attendance']).optional(),
    status: z.enum(['active', 'invited', 'suspended']).optional(),
    job_title: z.string().max(150).optional().nullable(),
    qualification: z.string().max(150).optional().nullable(),
    field_of_study: z.string().max(150).optional().nullable(),
    gender: z.enum(['male', 'female', 'other']).optional().nullable(),
    section_count: z.number().int().min(0).optional().nullable(),
    periods_per_week: z.number().int().min(0).optional().nullable(),
    overtime_periods: z.number().int().min(0).optional().nullable(),
    total_periods: z.number().int().min(0).optional().nullable(),
    joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    scope_level_groups: z.array(z.enum(['nursery', 'kg', 'primary', 'secondary'])).nullable().optional(),
  }),
});

// Compensation is a separate, finance-only edit surface.
const compensationSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    basic_salary: z.number().min(0).nullable().optional(),
    allowance: z.number().min(0).nullable().optional(),
    housing_allowance: z.number().min(0).nullable().optional(),
    account_allowance: z.number().min(0).nullable().optional(),
    phone_allowance: z.number().min(0).nullable().optional(),
  }),
});

module.exports = { createUserSchema, updateUserSchema, compensationSchema };
