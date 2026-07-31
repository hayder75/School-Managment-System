const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const setPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email() }) });
const resetPasswordSchema = z.object({ body: z.object({ token: z.string().min(1), password: z.string().min(6) }) });

const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

module.exports = { loginSchema, setPasswordSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema };
