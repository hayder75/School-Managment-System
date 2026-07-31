const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const config = require('../../config');
const { authRateLimiter } = require('../../middleware/rateLimiter');
const { loginSchema, setPasswordSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require('./auth.validation');

const router = Router();

if (config.env !== 'production') {
  router.get('/dev-users', controller.devUsers);
}
router.post('/login', authRateLimiter(), validate(loginSchema), controller.login);
router.post('/logout', controller.logout);
router.get('/me', auth, controller.me);
router.put('/change-password', auth, validate(changePasswordSchema), controller.changePassword);
router.post('/set-password', validate(setPasswordSchema), controller.setPassword);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

module.exports = router;
