const classService = require('./classes.service');
const { getUserScopes } = require('../../shared/scope');

async function create(req, res) {
  const cls = await classService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: cls });
}

async function list(req, res) {
  const { page, limit, academic_year_id } = req.query;
  const scopes = await getUserScopes(req.tenant.id, req.user.userId);
  const result = await classService.findAll(req.tenant.id, { page, limit, academic_year_id, scopes });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const cls = await classService.findById(req.tenant.id, req.params.id);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
  }
  res.json({ success: true, data: cls });
}

async function update(req, res) {
  const cls = await classService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
  }
  res.json({ success: true, data: cls });
}

async function remove(req, res) {
  await classService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function setHomeroom(req, res) {
  const cls = await classService.setHomeroom(req.tenant.id, req.params.id, req.validated.body.class_teacher_id);
  if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
  res.json({ success: true, data: cls });
}


async function listSupportStaff(req, res) {
  const data = await classService.listSupportStaff(req.tenant.id, req.params.id);
  res.json({ success: true, data });
}

async function addSupportStaff(req, res) {
  try {
    const row = await classService.addSupportStaff(
      req.tenant.id,
      req.params.id,
      req.validated.body.user_id,
      {
        canMarkAttendance: req.validated.body.can_mark_attendance,
        canEnterMarks: req.validated.body.can_enter_marks,
      },
      req.user.userId
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') return res.status(404).json({ success: false, error: { code: err.code, message: 'User not found' } });
    if (err.code === 'CLASS_NOT_FOUND') return res.status(404).json({ success: false, error: { code: err.code, message: 'Class not found' } });
    if (err.code === 'SUPPORT_MUST_BE_STAFF') return res.status(400).json({ success: false, error: { code: err.code, message: 'Support staff must be a Teacher or Support account' } });
    if (err.code === 'ALREADY_HOMEROOM') return res.status(400).json({ success: false, error: { code: err.code, message: 'This teacher is already the homeroom teacher' } });
    throw err;
  }
}

async function removeSupportStaff(req, res) {
  await classService.removeSupportStaff(req.tenant.id, req.params.id, req.params.userId);
  res.json({ success: true, data: null });
}

module.exports = { create, list, getById, update, remove, setHomeroom, listSupportStaff, addSupportStaff, removeSupportStaff };
