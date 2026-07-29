const { z } = require('zod');

const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'School name is required').max(255),
    slug: z.string().min(1, 'Slug is required').max(100)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
    domain: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    owner_email: z.string().email('Valid owner email is required').optional(),
    owner_first_name: z.string().optional(),
    owner_last_name: z.string().optional(),
  }),
});

const updateTenantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    domain: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    status: z.enum(['active', 'suspended', 'trial']).optional(),
    subscription_plan: z.string().optional(),
  }),
});

module.exports = { createTenantSchema, updateTenantSchema };
