const { z } = require('zod');

const createSalaryGradeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    basic_salary: z.number().positive(),
    allowances: z.object({}).passthrough().optional(),
    deductions: z.object({}).passthrough().optional(),
    is_active: z.boolean().default(true),
  }),
});

const updateSalaryGradeSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    basic_salary: z.number().positive().optional(),
    allowances: z.object({}).passthrough().optional(),
    deductions: z.object({}).passthrough().optional(),
    is_active: z.boolean().optional(),
  }),
});

const createPayrollSchema = z.object({
  body: z.object({
    user_id: z.string().uuid(),
    salary_grade_id: z.string().uuid().nullable().optional(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    basic_pay: z.number().positive(),
    allowances_total: z.number().min(0).default(0),
    deductions_total: z.number().min(0).default(0),
    net_pay: z.number().positive(),
    status: z.enum(['pending', 'paid', 'cancelled']).default('pending'),
    paid_date: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

const updatePayrollSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'paid', 'cancelled']).optional(),
    paid_date: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

const taxBracketSchema = z.object({ body: z.object({ min_salary: z.number().min(0), max_salary: z.number().optional(), rate: z.number().min(0).max(100), deduction: z.number().default(0), is_active: z.boolean().optional() }) });
const leaveSchema = z.object({ body: z.object({ leave_type: z.enum(['annual','sick','maternity','paternity','emergency','unpaid']), start_date: z.string(), end_date: z.string(), reason: z.string().optional() }) });

module.exports = { createSalaryGradeSchema, updateSalaryGradeSchema, createPayrollSchema, updatePayrollSchema, taxBracketSchema, leaveSchema };
