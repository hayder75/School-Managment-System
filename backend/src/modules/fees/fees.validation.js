const { z } = require('zod');

const amountTierSchema = z.object({
  grade_level: z.number().int(),
  amount: z.number().min(0),
});

const createFeeStructureSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    class_id: z.string().uuid().nullable().optional(),
    amount: z.number().min(0),
    frequency: z.enum(['monthly', 'termly', 'yearly', 'one-time']).default('termly'),
    due_date: z.string().optional(),
    late_fee: z.number().min(0).default(0),
    is_active: z.boolean().default(true),
    is_mandatory: z.boolean().default(true),
    amounts: z.array(amountTierSchema).optional(),
  }),
});

const updateFeeStructureSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    class_id: z.string().uuid().nullable().optional(),
    amount: z.number().min(0).optional(),
    frequency: z.enum(['monthly', 'termly', 'yearly', 'one-time']).optional(),
    due_date: z.string().optional(),
    late_fee: z.number().min(0).optional(),
    is_active: z.boolean().optional(),
    is_mandatory: z.boolean().optional(),
    amounts: z.array(amountTierSchema).optional(),
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

const bulkCreatePaymentsSchema = z.object({  body: z.object({
    payments: z.array(z.object({
      student_id: z.string().uuid(),
      fee_structure_id: z.string().uuid().nullable().optional(),
      amount_paid: z.number().positive(),
      balance: z.number().min(0).default(0),
      due_date: z.string().optional(),
      paid_date: z.string().optional(),
      status: z.enum(['pending', 'partial', 'paid', 'overdue', 'refunded']).default('paid'),
      payment_method: z.enum(['cash', 'bank', 'card', 'mobile']).default('cash'),
      remarks: z.string().optional(),
    })).min(1, 'At least one payment is required'),
  }),
});

const updatePaymentSchema = z.object({
  body: z.object({
    amount_paid: z.number().positive().optional(),
    balance: z.number().min(0).optional(),
    due_date: z.string().optional(),
    paid_date: z.string().optional(),
    status: z.enum(['pending', 'partial', 'paid', 'overdue', 'refunded']).optional(),
    payment_method: z.enum(['cash', 'bank', 'card', 'mobile']).optional(),
    remarks: z.string().optional(),
  }),
});

const subscriptionSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    fee_structure_id: z.string().uuid(),
    subscribed: z.boolean(),
  }),
});

module.exports = { createFeeStructureSchema, updateFeeStructureSchema, createPaymentSchema, updatePaymentSchema, bulkCreatePaymentsSchema, subscriptionSchema };
