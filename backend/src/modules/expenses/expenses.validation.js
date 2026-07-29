const { z } = require('zod');

const createExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    amount: z.number().positive(),
    expense_date: z.string().optional(),
    paid_to: z.string().max(255).optional(),
    receipt_url: z.string().optional(),
  }),
});

const updateExpenseSchema = z.object({
  body: z.object({
    category: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    amount: z.number().positive().optional(),
    expense_date: z.string().optional(),
    paid_to: z.string().max(255).optional(),
    receipt_url: z.string().optional(),
  }),
});

module.exports = { createExpenseSchema, updateExpenseSchema };
