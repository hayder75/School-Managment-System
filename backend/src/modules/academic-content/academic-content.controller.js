const service = require('./academic-content.service');

async function list(req, res) {
  const tenantId = req.tenant.id;
  const data = await service.list(tenantId, req.query);
  res.json({ success: true, data });
}

async function getById(req, res) {
  const { id } = req.params;
  const row = await service.getById(req.tenant.id, id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } });
  const comments = await service.listComments(req.tenant.id, id);
  res.json({ success: true, data: { ...row, comments } });
}

async function create(req, res) {
  const row = await service.create(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}

async function updateOwn(req, res) {
  const row = await service.updateOwn(req.tenant.id, req.user.userId, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } });
  res.json({ success: true, data: row });
}

async function removeOwn(req, res) {
  const ok = await service.removeOwn(req.tenant.id, req.user.userId, req.params.id);
  if (!ok) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cannot delete this submission' } });
  res.json({ success: true, data: { deleted: true } });
}

async function addComment(req, res) {
  const row = await service.addComment(req.tenant.id, req.user.userId, req.params.id, req.body.comment);
  res.status(201).json({ success: true, data: row });
}

async function review(req, res) {
  try {
    const row = await service.review(req.tenant.id, req.user.userId, req.params.id, req.body);
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } });
    if (req.body.comment) {
      await service.addComment(req.tenant.id, req.user.userId, req.params.id, req.body.comment);
    }
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'COMMENT_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'A comment is required when requesting changes or rejecting' } });
    }
    if (err.code === 'NOT_SUBMITTED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'Only submitted content can be reviewed' } });
    }
    throw err;
  }
}

async function toggleBank(req, res) {
  const row = await service.toggleBank(req.tenant.id, req.params.id, req.body.banked);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Approved submission not found' } });
  res.json({ success: true, data: row });
}

async function summary(req, res) {
  const data = await service.summary(req.tenant.id);
  res.json({ success: true, data });
}

module.exports = { list, getById, create, updateOwn, removeOwn, addComment, review, toggleBank, summary };
