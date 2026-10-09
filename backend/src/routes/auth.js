const { Router } = require('express');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/security');
const { authenticate } = require('../middleware/auth');
const { profilePhotoUpload, idDocUpload, companyDocUpload, brokerLicenseUpload, brokerRegistrationUpload } = require('../middleware/upload');
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadId,
  registerBrokerAccount,
  registerCompanyAccount,
  getSettings,
  updateSettings,
} = require('../controllers/authController');

const router = Router();

// Ethiopian phone number regex: +251 followed by 9 digits, or 09/07 followed by 8 digits
const ETHIOPIAN_PHONE_RE = /^(\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$/;

/**
 * POST /api/auth/register
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
router.post(
  '/register',
  idDocUpload.single('nationalId'),
  [
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required.')
      .matches(ETHIOPIAN_PHONE_RE).withMessage('Phone must be a valid Ethiopian number.'),

    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required.'),

    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),

    body('role')
      .trim()
      .notEmpty().withMessage('Role is required.')
      .isIn(['user', 'broker', 'company']).withMessage('Role must be user, broker, or company.'),

    body('dateOfBirth')
      .optional()
      .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD).'),

    // Broker must supply businessLicense
    body('businessLicense').custom((value, { req }) => {
      if (req.body.role === 'broker' && !value) {
        throw new Error('Business license is required for brokers.');
      }
      return true;
    }),
  ],
  handleValidationErrors,
  register,
);

/**
 * POST /api/auth/verify-otp
 * Requirements: 2.1, 2.2, 2.3
 */
router.post(
  '/verify-otp',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required.'),
    body('otp').trim().notEmpty().withMessage('OTP is required.'),
  ],
  handleValidationErrors,
  verifyOtp,
);

/**
 * POST /api/auth/resend-otp
 * Requirements: 2.4
 */
router.post(
  '/resend-otp',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required.'),
  ],
  handleValidationErrors,
  resendOtp,
);

/**
 * POST /api/auth/login
 * Requirements: 4.1, 4.2, 24.4
 */
router.post(
  '/login',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  handleValidationErrors,
  login,
);

/**
 * POST /api/auth/refresh
 * Requirements: 4.3, 4.4
 */
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required.'),
  ],
  handleValidationErrors,
  refresh,
);

/**
 * POST /api/auth/logout
 * Requirements: 4.5
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Requirements: 5.1
 */
router.get('/me', authenticate, getMe);

/**
 * PUT /api/auth/me
 * Requirements: 5.2, 5.3
 */
router.put(
  '/me',
  authenticate,
  profilePhotoUpload.single('photo'),
  [
    body('preferredLanguage')
      .optional()
      .isIn(['en', 'am']).withMessage('preferredLanguage must be "en" or "am".'),
  ],
  handleValidationErrors,
  updateMe,
);

/**
 * POST /api/auth/change-password
 * Requirements: 5.4, 5.5
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  handleValidationErrors,
  changePassword,
);

/**
 * POST /api/auth/forgot-password
 * Requirements: 6.1, 6.4
 */
router.post(
  '/forgot-password',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required.'),
  ],
  handleValidationErrors,
  forgotPassword,
);

/**
 * POST /api/auth/reset-password
 * Requirements: 6.2, 6.3
 */
router.post(
  '/reset-password',
  [
    body('phone').trim().notEmpty().withMessage('Phone is required.'),
    body('otp').trim().notEmpty().withMessage('OTP is required.'),
    body('newPassword')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  ],
  handleValidationErrors,
  resetPassword,
);

/**
 * POST /api/auth/upload-id
 * Requirements: 3.1, 3.5
 */
router.post('/upload-id', authenticate, idDocUpload.single('idDoc'), uploadId);

/**
 * POST /api/auth/register-broker
 * Creates a broker account with license document upload in one unauthenticated request.
 */
router.post(
  '/register-broker',
  brokerRegistrationUpload.fields([
    { name: 'licenseDoc', maxCount: 1 },
    { name: 'nationalId', maxCount: 1 },
  ]),
  [
    body('phone')
      .trim().notEmpty().withMessage('Phone number is required.')
      .matches(ETHIOPIAN_PHONE_RE).withMessage('Phone must be a valid Ethiopian number.'),
    body('fullName').trim().notEmpty().withMessage('Full name is required.'),
    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('businessLicense').trim().notEmpty().withMessage('Business license number is required.'),
    body('dateOfBirth').optional().isISO8601().withMessage('Date of birth must be a valid date.'),
  ],
  handleValidationErrors,
  registerBrokerAccount,
);

/**
 * POST /api/auth/register-company
 * Creates a new user account + pending company registration in one unauthenticated request.
 * Accepts multipart/form-data with businessRegistrationDoc file.
 */
router.post(
  '/register-company',
  companyDocUpload.single('businessRegistrationDoc'),
  [
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required.')
      .matches(/^(\+2519\d{8}|\+2517\d{8}|09\d{8}|07\d{8})$/).withMessage('Phone must be a valid Ethiopian number.'),
    body('fullName').trim().notEmpty().withMessage('Full name is required.'),
    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('companyName').trim().notEmpty().withMessage('Company name is required.'),
    body('industry').trim().notEmpty().withMessage('Industry is required.'),
    body('contactEmail').trim().isEmail().withMessage('A valid contact email is required.'),
    body('contactPhone').trim().notEmpty().withMessage('Contact phone is required.'),
    body('businessRegistrationNumber').trim().notEmpty().withMessage('Business registration number is required.'),
  ],
  handleValidationErrors,
  registerCompanyAccount,
);

/**
 * GET /api/auth/settings  (protected)
 */
router.get('/settings', authenticate, getSettings);

/**
 * PUT /api/auth/settings  (protected)
 */
router.put('/settings', authenticate, updateSettings);

module.exports = router;
