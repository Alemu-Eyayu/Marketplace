'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { companyDocUpload, companyLogoUpload } = require('../middleware/upload');
const {
  registerCompany,
  updateCompanyProfile,
  listCompanies,
  getCompanyById,
  getMyCompany,
  getCompanyListings,
  submitContactInquiry,
  approveCompany,
  rejectCompany,
  suspendCompany,
  reactivateCompany,
  deleteCompany,
  listCompaniesAdmin,
  getCompanyAuditLog,
} = require('../controllers/companyController');

const router = Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// List verified companies (filterable by industry, city)
router.get('/companies', listCompanies);

// Get company's active listings (public)
router.get('/companies/:id/listings', getCompanyListings);

// ── Company registration (any authenticated user) ─────────────────────────────
// NOTE: must be defined before GET /companies/:id to avoid :id matching 'register'

router.post(
  '/companies/register',
  authenticate,
  companyDocUpload.single('businessRegistrationDoc'),
  registerCompany,
);

// Get the current user's own company (must be before /:id)
router.get('/companies/me', authenticate, getMyCompany);

// Get company profile (public if verified)
router.get('/companies/:id', authenticate, getCompanyById);

// Submit contact inquiry (authenticated users only)
router.post('/companies/:id/contact', authenticate, submitContactInquiry);

// ── Company profile management (company admin only) ───────────────────────────

router.put(
  '/companies/:id/profile',
  authenticate,
  requireRole('company'),
  companyLogoUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 },
  ]),
  updateCompanyProfile,
);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get('/admin/companies', authenticate, requireRole('admin'), listCompaniesAdmin);

router.patch('/companies/:id/approve', authenticate, requireRole('admin'), approveCompany);

router.patch('/companies/:id/reject', authenticate, requireRole('admin'), rejectCompany);

router.patch('/companies/:id/suspend', authenticate, requireRole('admin'), suspendCompany);

router.patch('/companies/:id/reactivate', authenticate, requireRole('admin'), reactivateCompany);

router.delete('/companies/:id', authenticate, requireRole('admin'), deleteCompany);

router.get('/companies/:id/audit-log', authenticate, requireRole('admin'), getCompanyAuditLog);

module.exports = router;
