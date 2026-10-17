const { Router } = require('express');
const ctrl = require('../reports/reports.controller');

// Public, unauthenticated. Returns ONLY a stored report snapshot — no live
// data access, no other internal endpoints reachable.
const router = Router();
router.get('/reports/:token', ctrl.getPublicShare);

module.exports = router;
