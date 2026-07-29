const teacherService = require('./teachers.service');

async function list(req, res) {
  const { page, limit, search } = req.query;
  const result = await teacherService.findTeachers(req.tenant.id, { page, limit, search });
  res.json({ success: true, ...result });
}

async function assignSubject(req, res) {
  const assignment = await teacherService.assignSubject(
    req.tenant.id,
    req.params.teacherId,
    req.validated.body
  );
  res.status(201).json({ success: true, data: assignment });
}

async function getAssignments(req, res) {
  const assignments = await teacherService.getAssignments(req.tenant.id, req.params.teacherId);
  res.json({ success: true, data: assignments });
}

async function removeAssignment(req, res) {
  await teacherService.removeAssignment(
    req.tenant.id,
    req.params.teacherId,
    req.params.assignmentId
  );
  res.json({ success: true, data: null });
}

module.exports = { list, assignSubject, getAssignments, removeAssignment };
