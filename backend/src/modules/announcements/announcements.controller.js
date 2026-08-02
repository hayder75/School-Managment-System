const announcementsService = require('./announcements.service');
const access = require('../../shared/access');
const db = require('../../config/database');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

async function create(req, res) {
  const announcement = await announcementsService.create(req.tenant.id, req.user.userId, req.validated.body);
  if (announcement.is_published) {
    await notifyAudience(req.tenant.id, announcement);
  }
  res.status(201).json({ success: true, data: announcement });
}

async function list(req, res) {
  const { page, limit, audience } = req.query;
  const result = await announcementsService.findAll(req.tenant.id, { page, limit, audience });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const announcement = await announcementsService.findById(req.tenant.id, req.params.id);
  if (!announcement) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
  res.json({ success: true, data: announcement });
}

async function update(req, res) {
  const existing = await announcementsService.findById(req.tenant.id, req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
  const announcement = await announcementsService.update(req.tenant.id, req.params.id, req.validated.body);
  if (announcement && announcement.is_published && !existing.is_published) {
    await notifyAudience(req.tenant.id, announcement);
  }
  res.json({ success: true, data: announcement });
}

async function remove(req, res) {
  await announcementsService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function listForUser(req, res) {
  const { userId, role } = req.user;
  const tid = req.tenant.id;
  let classIds;

  if (role === 'student') {
    const student = await access.getStudentForUser(tid, userId);
    classIds = student?.class_id ? [student.class_id] : [];
  } else if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(tid, userId);
    const rows = await db('students').where({ tenant_id: tid }).whereIn('user_id', children).select('class_id');
    classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  } else if (role === 'teacher') {
    const rows = await db('teacher_subjects').where({ tenant_id: tid, teacher_id: userId }).select('class_id');
    classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  } else {
    const rows = await db('classes').where({ tenant_id: tid }).select('id');
    classIds = rows.map((r) => r.id);
  }

  const announcements = await announcementsService.findForUser(tid, userId, role, classIds);
  res.json({ success: true, data: announcements });
}

async function notifyAudience(tenantId, announcement) {
  try {
    const { audience, class_id, created_by } = announcement;
    let userIds = [];

    if (audience === 'all') {
      const rows = await db('users').where({ tenant_id: tenantId }).select('id');
      userIds = rows.map((r) => r.id);
    } else if (audience === 'teachers' || audience === 'students' || audience === 'parents') {
      const singular = audience === 'teachers' ? 'teacher' : audience === 'students' ? 'student' : 'parent';
      const rows = await db('users').where({ tenant_id: tenantId, role: singular }).select('id');
      userIds = rows.map((r) => r.id);
    } else if (audience === 'class' && class_id) {
      const students = await db('students').where({ tenant_id: tenantId, class_id }).select('user_id');
      userIds = students.map((s) => s.user_id);
      const teachers = await db('teacher_subjects').where({ tenant_id: tenantId, class_id }).select('teacher_id');
      userIds = [...userIds, ...teachers.map((t) => t.teacher_id)];
      const parents = await db('student_parents')
        .join('students', 'student_parents.student_id', 'students.id')
        .where({ 'student_parents.tenant_id': tenantId, 'students.class_id': class_id })
        .select('student_parents.parent_id');
      userIds = [...userIds, ...parents.map((p) => p.parent_id)];
    }

    await broadcast.notifyUsers(
      tenantId,
      userIds.filter((id) => id && id !== created_by),
      {
        title: 'New Announcement',
        message: announcement.title,
        type: 'announcement',
        refType: 'announcement',
        refId: announcement.id,
      }
    );
  } catch (err) {
    logger.error('Announcement notification error', { error: err.message });
  }
}

module.exports = { create, list, getById, update, remove, listForUser };
