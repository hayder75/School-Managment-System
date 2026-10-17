const { Router } = require('express');
const controller = require('./sms.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

const SMS_ROLES = ['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'quality_director'];

router.get('/stats', requireAccess(SMS_ROLES, ['sms.manage']), controller.stats);
router.get('/recipients/preview', requireAccess(SMS_ROLES, ['sms.manage']), controller.preview);
router.get('/config', requireAccess(SMS_ROLES, ['sms.manage']), controller.getConfig);
router.put('/config', requireAccess(SMS_ROLES, ['sms.manage']), controller.putConfig);
router.get('/campaigns', requireAccess(SMS_ROLES, ['sms.manage']), controller.listCampaigns);
router.post('/campaigns', requireAccess(SMS_ROLES, ['sms.manage']), controller.create);
router.get('/campaigns/:id/messages', requireAccess(SMS_ROLES, ['sms.manage']), controller.listMessages);
router.post('/campaigns/:id/cancel', requireAccess(SMS_ROLES, ['sms.manage']), controller.cancel);
router.post('/process', requireAccess(SMS_ROLES, ['sms.manage']), controller.process);

module.exports = router;