const { z } = require('zod');

const sheetQuerySchema = z.object({
  query: z.object({
    class_id: z.string().uuid(),
    subject_id: z.string().uuid(),
    term_id: z.string().uuid(),
  }),
});

const overviewQuerySchema = z.object({
  query: z.object({
    term_id: z.string().uuid().optional(),
  }),
});

const cellSchema = z.object({
  student_id: z.string().uuid(),
  component_code: z.string().min(1).max(80),
  marks: z.union([z.number(), z.string(), z.null()]).optional(),
  text: z.string().max(2000).optional(),
});

const saveSchema = z.object({
  body: z.object({
    cells: z.array(cellSchema).max(20000),
    fill_blanks: z.boolean().optional(),
  }),
});

const reviewSchema = z.object({
  body: z.object({
    decision: z.enum(['approve', 'return']),
    comment: z.string().max(2000).optional(),
  }),
});

const configSchema = z.object({
  body: z.object({
    config: z.object({
      mode: z.enum(['weighted', 'raw']).optional(),
      pass_pct: z.number().min(0).max(100).optional(),
      groups: z.array(z.object({
        code: z.string().min(1).max(40),
        name: z.string().min(1).max(120),
        weight_pct: z.number().min(0).max(100),
        is_final: z.boolean().optional(),
        components: z.array(z.object({
          code: z.string().min(1).max(80),
          name: z.string().min(1).max(120),
          max_marks: z.number().min(0).max(10000).optional(),
          input_type: z.enum(['number', 'text']).optional(),
        })).max(100),
      })).max(30),
    }),
  }),
});

const templateSchema = z.object({
  body: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    level_group: z.enum(['nursery', 'kg', 'primary', 'secondary']).nullable().optional(),
    subject_id: z.string().uuid().nullable().optional(),
    term_id: z.string().uuid().nullable().optional(),
    is_default: z.boolean().optional(),
    config: z.object({
      mode: z.enum(['weighted', 'raw']).optional(),
      pass_pct: z.number().min(0).max(100).optional(),
      groups: z.array(z.any()).max(30),
    }),
  }),
});

const applyTemplateSchema = z.object({
  body: z.object({
    update_weights: z.boolean().optional(),
    dry_run: z.boolean().optional(),
  }).optional(),
});

module.exports = {
  applyTemplateSchema,
  sheetQuerySchema,
  overviewQuerySchema,
  saveSchema,
  reviewSchema,
  configSchema,
  templateSchema,
};
