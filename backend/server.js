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
const categoriesRouter = require('./src/routes/categories');

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
app.use('/api/categories', categoriesRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Ensures a default admin account exists in the database.
 * Runs automatically on every startup — safe to call on any database.
 * Credentials can be overridden via ADMIN_PHONE / ADMIN_PASSWORD env vars.
 */
async function seedAdmin() {
  const bcrypt = require('bcryptjs');
  const User   = require('./src/models/User');

  const phone    = process.env.ADMIN_PHONE    || '+251900000001';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const fullName = process.env.ADMIN_NAME     || 'System Admin';

  const existing = await User.findOne({ phone, role: 'admin' }).lean();
  if (existing) return; // already exists — nothing to do

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    phone,
    fullName,
    passwordHash,
    role: 'admin',
    isPhoneVerified: true,
    verificationStatus: 'verified',
    isActive: true,
  });
  console.log(`✅ Default admin seeded  →  phone: ${phone}`);
}

/**
 * Ensures all default categories exist in the database.
 * Safe to run on every startup — only inserts missing ones, never overwrites.
 */
async function seedCategories() {
  const Category = require('./src/models/Category');

  const defaults = [
    { slug: 'real-estate',         name: { en: 'Real Estate',          am: 'ሪል እስቴት' } },
    { slug: 'automotive',          name: { en: 'Automotive',           am: 'ተሽከርካሪ' } },
    { slug: 'electronics',         name: { en: 'Electronics',          am: 'ኤሌክትሮኒክስ' } },
    { slug: 'home-furniture',      name: { en: 'Home & Furniture',     am: 'ቤት እና የቤት ዕቃዎች' } },
    { slug: 'fashion-clothing',    name: { en: 'Fashion & Clothing',   am: 'ፋሽን እና አልባሳት' } },
    { slug: 'sports-fitness',      name: { en: 'Sports & Fitness',     am: 'ስፖርት እና ብቃት' } },
    { slug: 'books-media',         name: { en: 'Books & Media',        am: 'መጽሐፍት እና ሚዲያ' } },
    { slug: 'pets-animals',        name: { en: 'Pets & Animals',       am: 'የቤት እንስሳት' } },
    { slug: 'services',            name: { en: 'Services',             am: 'አገልግሎቶች' } },
    { slug: 'domestic-jobs',       name: { en: 'Domestic Jobs',        am: 'የቤት ውስጥ ስራዎች' } },
    { slug: 'professional-jobs',   name: { en: 'Professional Jobs',    am: 'ሙያዊ ስራዎች' } },
    { slug: 'business-industrial', name: { en: 'Business & Industrial',am: 'ንግድ እና ኢንዱስትሪ' } },
    { slug: 'agriculture',         name: { en: 'Agriculture',          am: 'ግብርና' } },
  ];

  let added = 0;
  for (const cat of defaults) {
    const exists = await Category.findOne({ slug: cat.slug }).lean();
    if (!exists) {
      await Category.create({ ...cat, isActive: true });
      added++;
    }
  }
  if (added > 0) console.log(`✅ Seeded ${added} missing categories`);
}

async function start() {
  await connectDB();
  await seedAdmin();
  await seedCategories();   // ← auto-seeds missing categories
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
