const authService = require('./auth.service');
const config = require('../../config');

async function login(req, res) {
  try {
    const { email, password } = req.validated.body;
    const result = await authService.login(email, password);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { user: result.user, token: result.token } });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
    if (err.message === 'ACCOUNT_INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
      });
    }
    throw err;
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  res.json({ success: true, data: null });
}

async function me(req, res) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    throw err;
  }
}

async function devUsers(req, res) {
  const users = await require('./auth.service').getDevUsers();
  res.json({ success: true, data: users });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.validated.body;
    await authService.forgotPassword(email);
    res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
  } catch (err) {
    res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.validated.body;
    await authService.resetPassword(token, password);
    res.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (err) {
    if (err.message === 'INVALID_TOKEN') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' } });
    }
    throw err;
  }
}

async function changePassword(req, res) {
  try {
    await authService.changePassword(req.user.userId, req.validated.body.current_password, req.validated.body.new_password);
    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } });
    }
    throw err;
  }
}

async function setPassword(req, res) {
  try {
    const { token, password } = req.validated.body;
    await authService.setPassword(token, password);
    res.json({ success: true, data: { message: 'Password set successfully' } });
  } catch (err) {
    if (err.message === 'INVALID_TOKEN') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired invitation token' },
      });
    }
    throw err;
  }
}

module.exports = { login, logout, me, devUsers, changePassword, setPassword, forgotPassword, resetPassword };
