const gradeService = require('./grades.service');

async function enterGrades(req, res) {
  const exam = await require('../../config/database')('exams')
    .where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  const result = await gradeService.upsertGrades(
    req.tenant.id, req.params.examId, req.validated.body.grades, req.user.userId
  );
  res.json({ success: true, data: { updated: result.length } });
}

async function getByExam(req, res) {
  const grades = await gradeService.getByExam(req.tenant.id, req.params.examId);
  res.json({ success: true, data: grades });
}

async function getByStudent(req, res) {
  const grades = await gradeService.getByStudent(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: grades });
}

async function lockGrades(req, res) {
  const result = await gradeService.lockGrades(
    req.tenant.id, req.params.examId, req.validated.body.lock, req.user.userId
  );
  res.json({ success: true, data: result });
}

module.exports = { enterGrades, getByExam, getByStudent, lockGrades };
