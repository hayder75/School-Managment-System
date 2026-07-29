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
  const link = await parentsService.linkParent(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: link });
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
