const { z } = require('zod');

const bookSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    author: z.string().optional(),
    isbn: z.string().optional(),
    category: z.string().optional(),
    publisher: z.string().optional(),
    published_year: z.number().int().optional(),
    shelf: z.string().optional(),
    description: z.string().optional(),
    replacement_cost: z.number().min(0).optional(),
    total_copies: z.number().int().min(1).optional(),
  }),
});

const updateBookSchema = z.object({
  body: bookSchema.shape.body.partial(),
});

const borrowSchema = z.object({
  body: z.object({
    book_id: z.string().uuid(),
    student_id: z.string().uuid(),
    due_date: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

const librarySettingsSchema = z.object({
  body: z.object({
    loan_days: z.number().int().min(1).max(365).optional(),
    fine_enabled: z.boolean().optional(),
    fine_per_day: z.number().min(0).optional(),
    grace_days: z.number().int().min(0).max(60).optional(),
    default_max_books: z.number().int().min(1).max(20).optional(),
  }),
});

const assessmentSchema = z.object({
  body: z.object({
    book_id: z.string().uuid(),
    condition: z.enum(['good', 'damaged', 'under_repair', 'lost', 'repaired', 'found']),
    copies: z.number().int().min(1).max(1000).optional(),
    note: z.string().max(2000).optional(),
  }),
});

const routeSchema = z.object({ body: z.object({ route_name: z.string().min(1), driver_name: z.string().optional(), driver_phone: z.string().optional(), vehicle_plate: z.string().optional(), capacity: z.number().optional() }) });
const transportAllocSchema = z.object({ body: z.object({ route_id: z.string().uuid(), student_id: z.string().uuid() }) });
const roomSchema = z.object({ body: z.object({ room_number: z.string().min(1), block_name: z.string().optional(), capacity: z.number().optional() }) });
const hostelAllocSchema = z.object({ body: z.object({ room_id: z.string().uuid(), student_id: z.string().uuid(), bed_number: z.number().optional() }) });

module.exports = { bookSchema, updateBookSchema, borrowSchema, librarySettingsSchema, assessmentSchema, routeSchema, transportAllocSchema, roomSchema, hostelAllocSchema };
