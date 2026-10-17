const { Router } = require('express');
const service = require('./help.service');

// Public (unauthenticated) help/manual endpoint. Returns documentation
// content only — no school records are exposed.
const router = Router();

router.get('/manual', (req, res) => {
  res.json({ success: true, data: service.getManual() });
});

module.exports = router;