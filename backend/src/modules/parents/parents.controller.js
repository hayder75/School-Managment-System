const parentsService = require('./parents.service');

async function list(req, res) {
  const { page, limit, search } = req.query;
  const result = await parentsService.findParents(req.tenant.id, { page, limit, search });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const parent = await parentsService.findParentById(req.tenant.id, req.params.id);
  if (!parent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Parent not found' } });
  res.json({ success: true, data: parent });
}

async function link(req, res) {
  try {
    const link = await parentsService.linkParent(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    if (err.code === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found in this school' } });
    }
    if (err.code === 'PARENT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'PARENT_NOT_FOUND', message: 'Parent not found in this school' } });
    }
    if (err.code === 'ALREADY_LINKED') {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_LINKED', message: 'This parent is already linked to the student' } });
    }
    throw err;
  }
}

async function unlink(req, res) {
  await parentsService.unlinkParent(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function updateLink(req, res) {
  const link = await parentsService.updateLink(req.tenant.id, req.params.id, req.validated.body);
  if (!link) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Link not found' } });
  res.json({ success: true, data: link });
}

async function myChildren(req, res) {
  const children = await parentsService.getChildrenForParent(req.tenant.id, req.user.userId);
  res.json({ success: true, data: children });
}

module.exports = { list, getById, link, unlink, updateLink, myChildren };
