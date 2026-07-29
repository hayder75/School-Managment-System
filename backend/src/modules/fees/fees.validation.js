const { z } = require('zod');

const createFeeStructureSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    class_id: z.string().uuid().nullable().optional(),
    amount: z.number().positive(),
    frequency: z.enum(['monthly', 'termly', 'yearly', 'one-time']).default('termly'),
    due_date: z.string().optional(),
    late_fee: z.number().min(0).default(0),
    is_active: z.boolean().default(true),
  }),
});

const updateFeeStructureSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    frequency: z.enum(['monthly', 'termly', 'yearly', 'one-time']).optional(),
    due_date: z.string().optional(),
    late_fee: z.number().min(0).optional(),
    is_active: z.boolean().optional(),
  }),
});

const createPaymentSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    fee_structure_id: z.string().uuid().nullable().optional(),
    amount_paid: z.number().positive(),
    balance: z.number().min(0).default(0),
    due_date: z.string().optional(),
    paid_date: z.string().optional(),
    status: z.enum(['pending', 'partial', 'paid', 'overdue', 'refunded']).default('paid'),
    payment_method: z.enum(['cash', 'bank', 'card', 'mobile']).default('cash'),
    remarks: z.string().optional(),
  }),
});

module.exports = { createFeeStructureSchema, updateFeeStructureSchema, createPaymentSchema };
