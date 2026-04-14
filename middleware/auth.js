const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: require valid JWT ────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ success: false, message: 'Password recently changed. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    next(err);
  }
};

// ── Restrict: role-based access ───────────────────────────────────
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission for this action.' });
  }
  next();
};
