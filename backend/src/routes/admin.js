'use strict';

const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listUsers,
  suspendUser,
  reinstateUser,
  deleteUser,
  listVerifications,
  reviewVerification,
  reportListing,
  reportMessage,
  listReports,
  actionReport,
  getAdminAnalytics,
  exportAnalytics,
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  getPendingListings,
  approveListing,
  rejectListing,
  getAllListings,
  adminDeleteListing,
  listConversations,
  getConversationMessages,
} = require('../controllers/adminController');

const {
  approveCompany,
  rejectCompany,
  suspendCompany,
  reactivateCompany,
  deleteCompany,
  listCompaniesAdmin,
  getCompanyAuditLog,
} = require('../controllers/companyController');

const router = Router();

const adminOnly = [authenticate, requireRole('admin')];

// User management
router.get('/admin/users', ...adminOnly, listUsers);
router.patch('/admin/users/:id/suspend', ...adminOnly, suspendUser);
router.patch('/admin/users/:id/reinstate', ...adminOnly, reinstateUser);
router.delete('/admin/users/:id', ...adminOnly, deleteUser);

// Verification queue
router.get('/admin/verifications', ...adminOnly, listVerifications);
router.patch('/admin/verifications/:id', ...adminOnly, reviewVerification);

// Content moderation — user-facing reports
router.post('/listings/:id/report', authenticate, reportListing);
router.post('/messages/:id/report', authenticate, reportMessage);

// Admin moderation queue
router.get('/admin/reports', ...adminOnly, listReports);
router.patch('/admin/reports/:id', ...adminOnly, actionReport);

// Analytics
router.get('/admin/analytics', ...adminOnly, getAdminAnalytics);
router.get('/admin/analytics/export', ...adminOnly, exportAnalytics);

// Category management
router.get('/admin/categories', ...adminOnly, listCategories);
router.post('/admin/categories', ...adminOnly, createCategory);
router.put('/admin/categories/:id', ...adminOnly, updateCategory);
router.patch('/admin/categories/:id/status', ...adminOnly, updateCategoryStatus);
router.delete('/admin/categories/:id', ...adminOnly, deleteCategory);

// Listing management
router.get('/admin/listings/pending', ...adminOnly, getPendingListings);
router.get('/admin/listings', ...adminOnly, getAllListings);
router.patch('/admin/listings/:id/approve', ...adminOnly, approveListing);
router.patch('/admin/listings/:id/reject', ...adminOnly, rejectListing);
router.delete('/admin/listings/:id', ...adminOnly, adminDeleteListing);

// Company management
router.get('/admin/companies', ...adminOnly, listCompaniesAdmin);
router.patch('/admin/companies/:id/approve', ...adminOnly, approveCompany);
router.patch('/admin/companies/:id/reject', ...adminOnly, rejectCompany);
router.patch('/admin/companies/:id/suspend', ...adminOnly, suspendCompany);
router.patch('/admin/companies/:id/reactivate', ...adminOnly, reactivateCompany);
router.delete('/admin/companies/:id', ...adminOnly, deleteCompany);
router.get('/admin/companies/:id/audit-log', ...adminOnly, getCompanyAuditLog);

// Chat history
router.get('/admin/conversations', ...adminOnly, listConversations);
router.get('/admin/conversations/:id/messages', ...adminOnly, getConversationMessages);

module.exports = router;
