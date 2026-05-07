const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ═══ In-memory user cache (TTL: 5 minutes) ═══
const userCache = new Map();
const USER_CACHE_TTL = 5 * 60 * 1000;

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      // Check cache first
      const cached = userCache.get(decoded.id);
      if (cached && (Date.now() - cached.timestamp) < USER_CACHE_TTL) {
        req.user = cached.user;
        return next();
      }

      // Cache miss — fetch from DB (use .lean() for plain JS object)
      const user = await User.findById(decoded.id).select('-password').lean();
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Store in cache
      userCache.set(decoded.id, { user, timestamp: Date.now() });
      req.user = user;
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // No token provided
  return res.status(401).json({ message: 'Not authorized, no token' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
