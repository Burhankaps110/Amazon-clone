require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// ── Connect Database ──────────────────────────────────────────────
connectDB();

const app = express();

// ── Security Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Global rate limiter (100 req / 15 min per IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

// Auth routes get a stricter limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// ── Core Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));  // Prevent large payload attacks
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/payment',  require('./routes/payment'));

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── 404 Handler ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`));
