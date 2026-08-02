const { z } = require('zod');

const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Role name is required').max(100),
    description: z.string().max(500).optional().nullable(),
    permission_keys: z.array(z.string()).optional().default([]),
  }),
});

const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Role name is required').max(100),
    description: z.string().max(500).optional().nullable(),
    permission_keys: z.array(z.string()).optional().default([]),
  }),
});

const setUserAccessSchema = z.object({
  body: z.object({
    role_ids: z.array(z.string().uuid()).optional().default([]),
    permission_keys: z.array(z.string()).optional().default([]),
  }),
});

module.exports = { createRoleSchema, updateRoleSchema, setUserAccessSchema };
