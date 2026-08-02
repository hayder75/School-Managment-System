const { z } = require('zod');

const studentFields = {
  user_id: z.string().uuid(),
  class_id: z.string().uuid(),
  student_number: z.string().max(50).optional(),
  enrollment_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  medical_info: z.record(z.any()).optional(),
  previous_school: z.string().max(255).optional(),
  admission_type: z.enum(['new', 'transfer_in']).optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  home_address: z.string().optional(),
  transfer_date: z.string().optional(),
  father_name: z.string().max(100).optional(),
  grandfather_name: z.string().max(100).optional(),
  mother_name: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  country_of_birth: z.string().max(100).optional(),
  region_of_residence: z.string().max(150).optional(),
  zone_of_residence: z.string().max(150).optional(),
  woreda_of_residence: z.string().max(150).optional(),
  region_of_birth: z.string().max(150).optional(),
  zone_of_birth: z.string().max(150).optional(),
  woreda_of_birth: z.string().max(150).optional(),
  kebele: z.string().max(150).optional(),
  location_type: z.enum(['urban', 'rural']).optional(),
  disability: z.boolean().optional(),
  disability_type: z.string().max(100).optional(),
  economic_status: z.string().max(20).optional(),
  national_id: z.string().max(50).optional(),
  parent_status: z.string().max(50).optional(),
  family_head_gender: z.enum(['male', 'female']).optional(),
};

const createStudentSchema = z.object({
  body: z.object({ ...studentFields }),
});

const updateStudentSchema = z.object({
  body: z.object({
    class_id: z.string().uuid().optional(),
    student_number: z.string().max(50).optional(),
    status: z.enum(['active', 'transferred', 'dropped', 'graduated']).optional(),
    emergency_contact: z.string().optional(),
    medical_info: z.record(z.any()).optional(),
    previous_school: z.string().max(255).optional(),
    admission_type: z.enum(['new', 'transfer_in']).optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    home_address: z.string().optional(),
    transfer_date: z.string().optional(),
    father_name: z.string().max(100).optional(),
    grandfather_name: z.string().max(100).optional(),
    mother_name: z.string().max(100).optional(),
    nationality: z.string().max(100).optional(),
    country_of_birth: z.string().max(100).optional(),
    region_of_residence: z.string().max(150).optional(),
    zone_of_residence: z.string().max(150).optional(),
    woreda_of_residence: z.string().max(150).optional(),
    region_of_birth: z.string().max(150).optional(),
    zone_of_birth: z.string().max(150).optional(),
    woreda_of_birth: z.string().max(150).optional(),
    kebele: z.string().max(150).optional(),
    location_type: z.enum(['urban', 'rural']).optional(),
    disability: z.boolean().optional(),
    disability_type: z.string().max(100).optional(),
    economic_status: z.string().max(20).optional(),
    national_id: z.string().max(50).optional(),
    parent_status: z.string().max(50).optional(),
    family_head_gender: z.enum(['male', 'female']).optional(),
  }),
});

const enrollSchema = z.object({
  body: z.object({
    ...studentFields,
    status: z.string().optional(),
    guardians: z.array(z.object({
      parent_id: z.string().uuid(),
      relationship: z.string().optional(),
      is_primary: z.boolean().optional(),
      education_level: z.string().max(150).optional(),
    })).optional(),
    enrollment: z.object({
      academic_year_id: z.string().uuid().optional(),
      class_id: z.string().uuid().optional(),
      grade_level: z.number().int().optional(),
      section: z.string().max(20).optional(),
      admission_category: z.string().max(50).optional(),
      admission_modality: z.string().max(50).optional(),
      education_stream: z.string().max(100).optional(),
      cte_field_1: z.string().max(150).optional(),
      cte_field_2: z.string().max(150).optional(),
      num_textbooks: z.number().int().optional(),
      instructional_language: z.string().max(100).optional(),
      school_feeding: z.boolean().optional(),
      food_ration_home: z.boolean().optional(),
      meals_per_week: z.number().int().optional(),
    }).optional(),
  }),
});

const enrollmentSchema = z.object({
  body: z.object({
    academic_year_id: z.string().uuid().optional(),
    class_id: z.string().uuid().optional(),
    grade_level: z.number().int().optional(),
    section: z.string().max(20).optional(),
    admission_category: z.string().max(50).optional(),
    admission_modality: z.string().max(50).optional(),
    education_stream: z.string().max(100).optional(),
    cte_field_1: z.string().max(150).optional(),
    cte_field_2: z.string().max(150).optional(),
    num_textbooks: z.number().int().optional(),
    instructional_language: z.string().max(100).optional(),
    school_feeding: z.boolean().optional(),
    food_ration_home: z.boolean().optional(),
    meals_per_week: z.number().int().optional(),
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
    previous_school: z.string().max(255).optional(),
    transfer_date: z.string().optional(),
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
  achievementSchema, enrollmentSchema,
};
