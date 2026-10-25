const service = require('./face-attendance.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

async function listStaff(req, res) {
  ok(res, await service.listStaff(req.tenant.id, { search: req.query.search }));
}

async function enroll(req, res) {
  const descriptors = req.body?.descriptors;
  try {
    ok(res, await service.enroll(req.tenant.id, req.params.userId, req.user.userId, descriptors), 201);
  } catch (err) {
    const code = err.code === 'NOT_FOUND' ? 404 : 400;
    res.status(code).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
  }
}

async function remove(req, res) {
  ok(res, await service.deleteTemplates(req.tenant.id, req.params.userId));
}

async function scan(req, res) {
  const { descriptor, session, livenessPassed, deviceInfo } = req.body || {};
  try {
    const result = await service.scan(req.tenant.id, req.user.userId, {
      descriptor,
      session,
      livenessPassed,
      ip: req.ip,
      deviceInfo: deviceInfo || req.headers['user-agent'],
    });
    ok(res, result);
  } catch (err) {
    res.status(400).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
  }
}

async function exception(req, res) {
  const { staffId, session, status } = req.body || {};
  try {
    ok(res, await service.setException(req.tenant.id, req.user.userId, { staffId, session, status }), 201);
  } catch (err) {
    res.status(400).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
  }
}

async function today(req, res) {
  ok(res, await service.today(req.tenant.id));
}

async function getSettings(req, res) {
  ok(res, await service.getSettings(req.tenant.id));
}

async function updateSettings(req, res) {
  ok(res, await service.updateSettings(req.tenant.id, req.body || {}));
}

module.exports = { listStaff, enroll, remove, scan, exception, today, getSettings, updateSettings };