const { Router } = require('express');
const ctrl = require('./security.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

// Visitor log — security head manages, leadership reads
router.get('/visitors', requireAccess(['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'security_head'], ['security.manage']), ctrl.listVisitors);
router.post('/visitors', requireAccess(['security_head'], ['security.manage']), ctrl.createVisitor);
router.post('/visitors/:id/checkout', requireAccess(['security_head'], ['security.manage']), ctrl.checkoutVisitor);

// Student gate passes — issued by admin/principal/VP, verified by security
router.get('/gate-passes', requireAccess(['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'security_head'], ['security.manage']), ctrl.listGatePasses);
router.post('/gate-passes', requireAccess(['admin', 'owner', 'principal', 'vice_principal'], ['students.manage', 'discipline.manage']), ctrl.createGatePass);
router.post('/gate-passes/verify', requireAccess(['security_head'], ['security.manage']), ctrl.verifyGatePass);
router.post('/gate-passes/:id/cancel', requireAccess(['admin', 'owner', 'principal', 'vice_principal'], ['discipline.manage', 'students.manage']), ctrl.cancelGatePass);

// Incidents
router.get('/incidents', requireAccess(['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'security_head'], ['security.manage']), ctrl.listIncidents);
router.post('/incidents', requireAccess(['security_head'], ['security.manage']), ctrl.createIncident);
router.put('/incidents/:id', requireAccess(['security_head', 'owner', 'admin', 'general_manager'], ['security.manage']), ctrl.updateIncident);

module.exports = router;
