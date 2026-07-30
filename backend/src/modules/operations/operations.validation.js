const { z } = require('zod');

const bookSchema = z.object({ body: z.object({ title: z.string().min(1), author: z.string().optional(), isbn: z.string().optional(), category: z.string().optional(), total_copies: z.number().optional(), available_copies: z.number().optional() }) });
const borrowSchema = z.object({ body: z.object({ book_id: z.string().uuid(), student_id: z.string().uuid(), due_date: z.string() }) });
const routeSchema = z.object({ body: z.object({ route_name: z.string().min(1), driver_name: z.string().optional(), driver_phone: z.string().optional(), vehicle_plate: z.string().optional(), capacity: z.number().optional() }) });
const transportAllocSchema = z.object({ body: z.object({ route_id: z.string().uuid(), student_id: z.string().uuid() }) });
const roomSchema = z.object({ body: z.object({ room_number: z.string().min(1), block_name: z.string().optional(), capacity: z.number().optional() }) });
const hostelAllocSchema = z.object({ body: z.object({ room_id: z.string().uuid(), student_id: z.string().uuid(), bed_number: z.number().optional() }) });

module.exports = { bookSchema, borrowSchema, routeSchema, transportAllocSchema, roomSchema, hostelAllocSchema };
