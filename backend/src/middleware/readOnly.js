// Roles that may view data but must never create/update through these routes.
// Unit Leader is a custom tenant role used by the school as an observer role.
const READ_ONLY_ROLES = ['Unit Leader'];

function blockReadOnlyWrites(req, res, next) {
  if (READ_ONLY_ROLES.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'READ_ONLY_ROLE',
        message: 'This role can view this page but cannot change records.',
      },
    });
  }
  return next();
}

module.exports = { blockReadOnlyWrites, READ_ONLY_ROLES };
