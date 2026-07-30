const { z } = require('zod');

const createStudentSchema = z.object({
  body: z.object({
    user_id: z.string().uuid(),
    class_id: z.string().uuid(),
    student_number: z.string().max(50).optional(),
    enrollment_date: z.string().optional(),
    emergency_contact: z.string().optional(),
    medical_info: z.record(z.any()).optional(),
  }),
});

const updateStudentSchema = z.object({
  body: z.object({
    class_id: z.string().uuid().optional(),
    student_number: z.string().max(50).optional(),
    status: z.enum(['active', 'transferred', 'dropped', 'graduated']).optional(),
    emergency_contact: z.string().optional(),
    medical_info: z.record(z.any()).optional(),
  }),
});

const enrollSchema = z.object({
  body: z.object({
    user_id: z.string().uuid(),
    class_id: z.string().uuid(),
    student_number: z.string().max(50).optional(),
    enrollment_date: z.string().optional(),
    emergency_contact: z.string().optional(),
    status: z.string().optional(),
    guardians: z.array(z.object({
      parent_id: z.string().uuid(),
      relationship: z.string().optional(),
      is_primary: z.boolean().optional(),
    })).optional(),
  }),
});

const promoteSchema = z.object({
  body: z.object({
    student_ids: z.array(z.string().uuid()).min(1),
    from_class_id: z.string().uuid(),
    to_class_id: z.string().uuid(),
    academic_year: z.string().optional(),
  }),
});

const graduateSchema = z.object({
  body: z.object({
    student_ids: z.array(z.string().uuid()).min(1),
    certificate_number: z.string().optional(),
    academic_year: z.string().optional(),
  }),
});

const transferSchema = z.object({
  body: z.object({
    student_id: z.string().uuid(),
    transfer_type: z.enum(['internal', 'external_in', 'external_out']).optional(),
    to_class_id: z.string().uuid(),
    reason: z.string().optional(),
  }),
});

const documentSchema = z.object({
  body: z.object({
    type: z.enum(['birth_certificate', 'report_card', 'photo', 'medical', 'other']),
    name: z.string().min(1).max(255),
    file_url: z.string().optional(),
  }),
});

const medicalSchema = z.object({
  body: z.object({
    blood_group: z.string().optional(),
    allergies: z.string().optional(),
    chronic_conditions: z.string().optional(),
    emergency_contacts: z.array(z.any()).optional(),
    doctor_info: z.record(z.any()).optional(),
    insurance: z.record(z.any()).optional(),
  }),
});

const disciplineSchema = z.object({
  body: z.object({
    incident_type: z.enum(['lateness', 'misconduct', 'bullying', 'cheating', 'other']),
    description: z.string().min(1),
    status: z.string().optional(),
  }),
});

const disciplineUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['open', 'resolved', 'dismissed']),
  }),
});

const achievementSchema = z.object({
  body: z.object({
    type: z.enum(['academic', 'sports', 'arts', 'behavior', 'other']),
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    achieved_date: z.string().optional(),
  }),
});

module.exports = {
  createStudentSchema, updateStudentSchema, enrollSchema,
  promoteSchema, graduateSchema, transferSchema,
  documentSchema, medicalSchema,
  disciplineSchema, disciplineUpdateSchema,
  achievementSchema,
};
