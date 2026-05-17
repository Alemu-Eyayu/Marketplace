require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const getRedisClient = require('./src/config/redis');
const { helmetMiddleware, correlationId, csrfToken, sanitizeInput, apiRateLimiter, authRateLimiter } = require('./src/middleware/security');
const errorHandler = require('./src/middleware/errorHandler');
const authRouter = require('./src/routes/auth');
const listingsRouter = require('./src/routes/listings');
const searchRouter = require('./src/routes/search');
const messagingRouter = require('./src/routes/messaging');
const usersRouter = require('./src/routes/users');
const subscriptionsRouter = require('./src/routes/subscriptions');
const adminRouter = require('./src/routes/admin');
const notificationsRouter = require('./src/routes/notifications');
const ussdRouter = require('./src/routes/ussd');
const companiesRouter = require('./src/routes/companies');
const premiumSubscriptionsRouter = require('./src/routes/premiumSubscriptions');

const { startExpiryJob } = require('./src/jobs/expiryJob');
const { initSocket } = require('./src/config/socket');


const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(correlationId);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ── Input sanitization & CSRF token ──────────────────────────────────────────
app.use(sanitizeInput);
app.use(csrfToken);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/search', searchRouter);
app.use('/api/conversations', messagingRouter);
app.use('/api/users', usersRouter);
app.use('/api', subscriptionsRouter);
app.use('/api', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ussd', ussdRouter);
app.use('/api', companiesRouter);
app.use('/api/premium-subscriptions', premiumSubscriptionsRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  getRedisClient(); // initialise singleton
  startExpiryJob(app);

  const httpServer = http.createServer(app);
  initSocket(httpServer, app);

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
