const { z } = require('zod');

const createSubmissionSchema = z.object({
  type: z.enum(['test', 'exam', 'notes', 'lesson_plan', 'worksheet']),
  title: z.string().min(2).max(255),
  classId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  academicYearId: z.string().uuid().optional().nullable(),
  termId: z.string().uuid().optional().nullable(),
  weekNumber: z.number().int().min(1).max(52).optional().nullable(),
  body: z.string().optional().nullable(),
  attachmentUrl: z.string().url().or(z.string().min(1)).optional().nullable(),
  answerKeyUrl: z.string().url().or(z.string().min(1)).optional().nullable(),
  submitNow: z.boolean().optional(),
});

const updateSubmissionSchema = createSubmissionSchema.partial();

const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'needs_revision', 'rejected']),
  comment: z.string().optional(),
  rubricScores: z.record(z.any()).optional(),
  isBanked: z.boolean().optional(),
});

const addCommentSchema = z.object({
  comment: z.string().min(1).max(2000),
});

module.exports = {
  createSubmissionSchema,
  updateSubmissionSchema,
  reviewSubmissionSchema,
  addCommentSchema,
};
