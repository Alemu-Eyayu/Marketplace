const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const getRedisClient = require('../config/redis');
const cloudinary = require('../config/cloudinary');
const { logActivity } = require('../middleware/activityLog');

let otpService;
try {
  otpService = require('../services/otpService');
} catch (_) {
  otpService = null;
}

/**
 * POST /api/auth/register
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
async function register(req, res, next) {
  try {
    const { phone, fullName, password, role, dateOfBirth, businessLicense } = req.body;

    // Age check — must be 18+ (Req 1.4)
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
      }
      if (age < 18) {
        return res.status(422).json({
          success: false,
          message: 'You must be at least 18 years old to register.',
        });
      }
    }

    // Duplicate phone check (Req 1.2)
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number already exists.',
      });
    }

    // Hash password with bcrypt cost factor 12 (Req 1.5)
    const passwordHash = await bcrypt.hash(password, 12);

    // Build user document
    const userData = {
      phone,
      fullName,
      passwordHash,
      role,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    // Validate role
    const allowedRoles = ['user', 'broker', 'company'];
    if (!allowedRoles.includes(role)) {
      return res.status(422).json({ success: false, message: 'Invalid role. Must be user, broker, or company.' });
    }

    // Broker business license (Req 1.6)
    if (role === 'broker' && businessLicense) {
      userData.businessLicense = businessLicense;
    }

    // National ID upload for individual users
    if (role === 'user' && req.file) {
      const cloudinary = require('../config/cloudinary');
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ethiogebiya/verification', resource_type: 'image' },
          (error, result) => { if (error) return reject(error); resolve(result); },
        );
        stream.end(req.file.buffer);
      });
      userData.verificationDoc = uploadResult.secure_url;
      userData.verificationStatus = 'pending';
    }

    const user = await User.create(userData);

    // If no SMS gateway configured, auto-verify phone so user can login immediately
    const noSmsGateway = !process.env.AFROMESSAGE_TOKEN;
    if (noSmsGateway) {
      await User.findByIdAndUpdate(user._id, { isPhoneVerified: true });

      // Always notify admins of new registration
      const { createNotification, notifyAdminNewUser } = require('../services/notificationService');
      await notifyAdminNewUser(req.app, {
        userId: user._id.toString(),
        fullName,
        role,
      });

      // Extra notification if national ID was submitted for verification
      if (role === 'user' && userData.verificationDoc) {
        const admins = await User.find({ role: 'admin' }).select('_id').lean();
        await Promise.allSettled(admins.map((admin) =>
          createNotification(req.app, {
            recipientId: admin._id.toString(),
            type: 'verification_pending',
            title: 'New Individual Verification',
            body: `${fullName} has submitted their national ID for verification.`,
            relatedId: user._id.toString(),
            relatedModel: 'User',
          }),
        ));
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful. You can now login.',
        autoVerified: true,
      });
    }

    // Trigger OTP send — if it fails, delete the user and return an error
    let devOtp = null;
    try {
      if (otpService && typeof otpService.sendOtp === 'function') {
        devOtp = await otpService.sendOtp(phone, 'registration');
      }
    } catch (otpErr) {
      // OTP send failed — roll back user creation so they can retry
      await User.findByIdAndDelete(user._id);
      console.error('[register] OTP send failed:', otpErr.message);
      return res.status(503).json({
        success: false,
        message: 'Failed to send verification SMS. Please check your phone number and try again.',
        detail: otpErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent.',
      ...(devOtp && { devOtp }),
    });
  } catch (err) {
    // Log the full error for debugging
    console.error('[register] Error:', err);
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Requirements: 2.1, 2.2, 2.3
 */
async function verifyOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required.',
      });
    }

    const isValid = await otpService.verifyOtp(phone, 'registration', otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP.',
      });
    }

    await User.findOneAndUpdate({ phone }, { isPhoneVerified: true });
    await otpService.invalidateOtp(phone, 'registration');

    return res.status(200).json({
      success: true,
      message: 'Phone verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Requirements: 2.4
 */
async function resendOtp(req, res, next) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone is required.',
      });
    }

    // Always attempt to send — do NOT reveal whether phone is registered
    try {
      if (otpService && typeof otpService.sendOtp === 'function') {
        await otpService.sendOtp(phone, 'registration');
      }
    } catch (otpErr) {
      console.error('[resendOtp] OTP send failed:', otpErr.message);
      return res.status(503).json({
        success: false,
        message: 'Failed to send SMS. Please verify your phone number is correct and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Requirements: 4.1, 4.2, 24.4
 */
async function login(req, res, next) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required.',
      });
    }

    const GENERIC_ERROR = { success: false, message: 'Invalid phone number or password.' };

    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json(GENERIC_ERROR);
    }

    // Check if user is suspended
    if (!user.isActive) {
      return res.status(401).json(GENERIC_ERROR);
    }

    // Block login if phone not verified
    if (!user.isPhoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your phone number before logging in.',
        requiresVerification: true,
        phone: user.phone,
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json(GENERIC_ERROR);
    }

    // Auto-correct role: if this user is a company admin but has wrong role, fix it
    if (user.role !== 'company') {
      const Company = require('../models/Company');
      const company = await Company.findOne({ adminUser: user._id }).select('_id').lean();
      if (company) {
        await User.findByIdAndUpdate(user._id, { role: 'company' });
        user.role = 'company';
      }
    }

    // For company users, resolve verification status from the Company document
    let resolvedVerificationStatus = user.verificationStatus;
    if (user.role === 'company') {
      const Company = require('../models/Company');
      const company = await Company.findOne({ adminUser: user._id, deletedAt: null })
        .select('verificationStatus')
        .sort({ createdAt: -1 })
        .lean();
      resolvedVerificationStatus = company?.verificationStatus || 'pending';
      // Keep User doc in sync
      if (resolvedVerificationStatus !== user.verificationStatus) {
        await User.findByIdAndUpdate(user._id, { verificationStatus: resolvedVerificationStatus });
      }
    }

    // Generate JWT pair (uses corrected role)
    const accessToken = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    const refreshToken = jwt.sign(
      { sub: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    // Store refresh token in Redis (TTL 7 days)
    const redis = getRedisClient();
    await redis.set(`refresh:${user._id}`, refreshToken, 'EX', 604800);

    // Log login activity (Req 5.6)
    await logActivity(user._id, 'login', { ip: req.ip });

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        verificationStatus: resolvedVerificationStatus,
        profilePhoto: user.profilePhoto,
        preferredLanguage: user.preferredLanguage || 'en',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Requirements: 4.3, 4.4
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify the refresh token signature and expiry
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (_) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const userId = payload.sub;
    const redis = getRedisClient();

    // Check stored token matches (revocation / rotation check)
    const stored = await redis.get(`refresh:${userId}`);
    if (!stored || stored !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or already rotated.' });
    }

    // Fetch user to embed role in new access token
    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or suspended.' });
    }

    // Issue new token pair
    const newAccessToken = jwt.sign(
      { sub: userId, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    const newRefreshToken = jwt.sign(
      { sub: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
    );

    // Rotate: delete old key, store new refresh token
    await redis.del(`refresh:${userId}`);
    await redis.set(`refresh:${userId}`, newRefreshToken, 'EX', 604800);

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Requirements: 4.5
 */
async function logout(req, res, next) {
  try {
    // Accept token from body or Authorization header
    let token = req.body && req.body.refreshToken;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Decode without verifying expiry so we can still revoke expired tokens
    let payload;
    try {
      payload = jwt.decode(token);
    } catch (_) {
      payload = null;
    }

    if (payload && payload.sub) {
      const redis = getRedisClient();
      await redis.del(`refresh:${payload.sub}`);
    }

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Requirements: 5.1
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Auto-correct role: if this user is a company admin but has wrong role, fix it
    if (user.role !== 'company') {
      const Company = require('../models/Company');
      const company = await Company.findOne({ adminUser: user._id }).select('_id').lean();
      if (company) {
        await User.findByIdAndUpdate(user._id, { role: 'company' });
        user.role = 'company';
      }
    }

    // For company users, resolve verification status from the Company document
    if (user.role === 'company') {
      const Company = require('../models/Company');
      const company = await Company.findOne({ adminUser: user._id, deletedAt: null })
        .select('verificationStatus')
        .sort({ createdAt: -1 })
        .lean();
      const companyStatus = company?.verificationStatus || 'pending';
      if (companyStatus !== user.verificationStatus) {
        await User.findByIdAndUpdate(user._id, { verificationStatus: companyStatus });
        user.verificationStatus = companyStatus;
      }
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/me
 * Requirements: 5.2, 5.3
 */
async function updateMe(req, res, next) {
  try {
    const { displayName, location, bio, preferredLanguage } = req.body;

    const updates = {};
    if (displayName !== undefined) updates.fullName = displayName;
    if (location !== undefined) updates.location = location;
    if (bio !== undefined) updates.bio = bio;
    if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;

    // Handle profile photo upload (Req 5.3)
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ethiogebiya/profiles', resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });
      updates.profilePhoto = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('-passwordHash').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 * Requirements: 5.4, 5.5
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Requirements: 6.1, 6.4
 */
async function forgotPassword(req, res, next) {
  try {
    const { phone } = req.body;

    // Always return generic response to prevent phone enumeration (Req 6.4)
    const GENERIC_RESPONSE = {
      success: true,
      message: 'If this number is registered, an OTP has been sent.',
    };

    try {
      if (otpService && typeof otpService.sendOtp === 'function') {
        await otpService.sendOtp(phone, 'password-reset');
      }
    } catch (otpErr) {
      console.error('[forgotPassword] OTP send failed (non-fatal):', otpErr.message);
    }

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Requirements: 6.2, 6.3
 */
async function resetPassword(req, res, next) {
  try {
    const { phone, otp, newPassword } = req.body;

    const isValid = await otpService.verifyOtp(phone, 'password-reset', otp);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Invalidate OTP after successful use (Req 6.3)
    await otpService.invalidateOtp(phone, 'password-reset');

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/upload-id
 * Requirements: 3.1, 3.5
 */
async function uploadId(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ID document file is required.' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ethiogebiya/verification', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      stream.end(req.file.buffer);
    });

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        verificationStatus: 'pending',
        verificationDoc: result.secure_url,
      },
    });

    return res.status(200).json({ success: true, message: 'ID document uploaded. Verification pending.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register-broker
 * Creates a broker account with license document upload in one unauthenticated request.
 * The uploaded licenseDoc is handled by idDocUpload middleware.
 */
async function registerBrokerAccount(req, res, next) {
  try {
    const {
      phone, fullName, password, dateOfBirth,
      businessLicense, licenseType,
      location, city, region, bio,
      specializations, // comma-separated string e.g. "real-estate,automotive"
      email, website,
    } = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!phone || !fullName || !password) {
      return res.status(422).json({ success: false, message: 'Phone, full name, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    if (!businessLicense) {
      return res.status(422).json({ success: false, message: 'Business license number is required.' });
    }
    if (!req.files?.licenseDoc?.[0]) {
      return res.status(422).json({ success: false, message: 'License document is required.' });
    }
    if (!req.files?.nationalId?.[0]) {
      return res.status(422).json({ success: false, message: 'National ID photo is required.' });
    }

    // Age check — must be 18+
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
      if (age < 18) {
        return res.status(422).json({ success: false, message: 'You must be at least 18 years old to register.' });
      }
    }

    // ── Duplicate phone check ─────────────────────────────────────────────────
    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists.' });
    }

    // ── Upload license doc to Cloudinary ──────────────────────────────────────
    const licenseFile = req.files.licenseDoc[0];
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ethiogebiya/brokers/licenses', resource_type: 'auto' },
        (error, result) => { if (error) return reject(error); resolve(result); },
      );
      stream.end(licenseFile.buffer);
    });

    // ── Upload national ID to Cloudinary ──────────────────────────────────────
    const nationalIdFile = req.files.nationalId[0];
    const nationalIdResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ethiogebiya/verification', resource_type: 'image' },
        (error, result) => { if (error) return reject(error); resolve(result); },
      );
      stream.end(nationalIdFile.buffer);
    });

    // ── Build full location string ────────────────────────────────────────────
    const fullLocation = [location, city, region].filter(Boolean).join(', ');

    // ── Parse specializations into expertise array ────────────────────────────
    const expertiseArr = specializations
      ? specializations.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // ── Create user ───────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);
    const userData = {
      phone,
      fullName,
      passwordHash,
      role: 'broker',
      businessLicense,
      verificationStatus: 'pending',
      verificationDoc: nationalIdResult.secure_url,
      businessLicenseDoc: uploadResult.secure_url,
      ...(licenseType && { licenseType }),
      ...(expertiseArr.length && { specializations: expertiseArr }),
      ...(fullLocation && { location: fullLocation }),
      ...(city && { city }),
      ...(region && { region }),
      ...(bio && { bio }),
      ...(email && { email }),
      ...(website && { website }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    };

    const user = await User.create(userData);

    // Auto-verify phone if no SMS gateway
    const noSmsGateway = !process.env.AFROMESSAGE_TOKEN;
    if (noSmsGateway) {
      await User.findByIdAndUpdate(user._id, { isPhoneVerified: true });

      // Notify admins of new broker registration + pending verification
      const { createNotification, notifyAdminNewUser } = require('../services/notificationService');
      await notifyAdminNewUser(req.app, {
        userId: user._id.toString(),
        fullName,
        role: 'broker',
      });
      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      await Promise.allSettled(admins.map((admin) =>
        createNotification(req.app, {
          recipientId: admin._id.toString(),
          type: 'verification_pending',
          title: 'New Broker Verification',
          body: `${fullName} has submitted a broker registration with national ID and license for review.`,
          relatedId: user._id.toString(),
          relatedModel: 'User',
        }),
      ));

      return res.status(201).json({
        success: true,
        message: 'Broker account created. You can now log in. Your documents will be reviewed by our team.',
        autoVerified: true,
      });
    }

    let devOtp = null;
    try {
      if (otpService && typeof otpService.sendOtp === 'function') {
        devOtp = await otpService.sendOtp(phone, 'registration');
      }
    } catch (otpErr) {
      await User.findByIdAndDelete(user._id);
      console.error('[registerBrokerAccount] OTP send failed:', otpErr.message);
      return res.status(503).json({
        success: false,
        message: 'Failed to send verification SMS. Please check your phone number and try again.',
        detail: otpErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Broker account created. Please verify your phone.',
      ...(devOtp && { devOtp }),
    });
  } catch (err) {
    console.error('[registerBrokerAccount] Error:', err);
    next(err);
  }
}

/**
 * POST /api/auth/register-company
 * Creates a user account AND a pending company registration in one unauthenticated request.
 * The uploaded businessRegistrationDoc is handled by companyDocUpload middleware.
 */
async function registerCompanyAccount(req, res, next) {
  try {
    const cloudinary = require('../config/cloudinary');
    const Company = require('../models/Company');

    const {
      // Personal account fields
      phone, fullName, password, dateOfBirth,
      // Company fields
      companyName, industry, contactEmail, contactPhone, businessRegistrationNumber,
      // Optional company fields
      address, website, description, foundedDate,
    } = req.body;

    // ── Validate personal account fields ──────────────────────────────────────
    if (!phone || !fullName || !password) {
      return res.status(422).json({ success: false, message: 'Phone, full name, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Age check — must be 18+
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
      if (age < 18) {
        return res.status(422).json({ success: false, message: 'You must be at least 18 years old to register.' });
      }
    }

    // ── Validate company fields ───────────────────────────────────────────────
    const missing = [];
    if (!companyName) missing.push('companyName');
    if (!industry) missing.push('industry');
    if (!contactEmail) missing.push('contactEmail');
    if (!contactPhone) missing.push('contactPhone');
    if (!businessRegistrationNumber) missing.push('businessRegistrationNumber');
    if (!req.file) missing.push('businessRegistrationDoc');
    if (missing.length > 0) {
      return res.status(422).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
    }

    // ── Duplicate checks ──────────────────────────────────────────────────────
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this phone number already exists.' });
    }

    const existingCompany = await Company.findOne({ businessRegistrationNumber }).lean();
    if (existingCompany) {
      return res.status(409).json({ success: false, message: 'A company with this registration number already exists.' });
    }

    // ── Upload registration doc to Cloudinary ─────────────────────────────────
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ethiogebiya/companies/docs', resource_type: 'auto' },
        (error, result) => { if (error) return reject(error); resolve(result); },
      );
      stream.end(req.file.buffer);
    });

    // ── Create user account (role = 'company' immediately so they get the right dashboard) ──
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ phone, fullName, passwordHash, role: 'company' });

    // Auto-verify phone if no SMS gateway
    const noSmsGateway = !process.env.AFROMESSAGE_TOKEN;
    if (noSmsGateway) {
      await User.findByIdAndUpdate(user._id, { isPhoneVerified: true });
    }

    // ── Create company (pending verification) ─────────────────────────────────
    const company = await Company.create({
      companyName,
      businessRegistrationNumber,
      businessRegistrationDoc: uploadResult.secure_url,
      industry,
      contactEmail,
      contactPhone,
      ...(address && { address }),
      ...(website && { website }),
      ...(description && { description }),
      ...(foundedDate && { foundedDate }),
      adminUser: user._id,
      verificationStatus: 'pending',
    });

    // ── Notify admins ─────────────────────────────────────────────────────────
    const { createNotification, notifyAdminNewUser } = require('../services/notificationService');

    // Notify admins of new company user registration
    await notifyAdminNewUser(req.app, {
      userId: user._id.toString(),
      fullName,
      role: 'company',
    });

    // Notify admins of the pending company registration
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    await Promise.allSettled(
      admins.map((admin) =>
        createNotification(req.app, {
          recipientId: admin._id.toString(),
          type: 'company_pending',
          title: 'New Company Registration',
          body: `${companyName} has submitted a company registration for review.`,
          relatedId: company._id.toString(),
          relatedModel: 'Company',
        }),
      ),
    );

    const { logActivity } = require('../middleware/activityLog');
    await logActivity(user._id, 'company_registered', { companyId: company._id, companyName });

    if (noSmsGateway) {
      return res.status(201).json({
        success: true,
        message: 'Account and company registration submitted. You can now log in. Your company will be activated after admin review.',
        autoVerified: true,
      });
    }

    // Send OTP for phone verification
    let devOtp = null;
    try {
      if (otpService && typeof otpService.sendOtp === 'function') {
        devOtp = await otpService.sendOtp(phone, 'registration');
      }
    } catch (otpErr) {
      // Roll back user and company on OTP failure
      await User.findByIdAndDelete(user._id);
      await Company.findByIdAndDelete(company._id);
      console.error('[registerCompanyAccount] OTP send failed:', otpErr.message);
      return res.status(503).json({
        success: false,
        message: 'Failed to send verification SMS. Please check your phone number and try again.',
        detail: otpErr.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created and company registration submitted. Please verify your phone.',
      ...(devOtp && { devOtp }),
    });
  } catch (err) {
    console.error('[registerCompanyAccount] Error:', err);
    next(err);
  }
}

/**
 * GET /api/auth/settings  (protected)
 */
async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('settings').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, settings: user.settings || {} });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/settings  (protected)
 */
async function updateSettings(req, res, next) {
  try {
    const { notifications, privacy, preferences, broker, user: userPrefs } = req.body;

    const updates = {};
    if (notifications) {
      if (notifications.email  !== undefined) updates['settings.notifications.email']  = notifications.email;
      if (notifications.sms    !== undefined) updates['settings.notifications.sms']    = notifications.sms;
      if (notifications.push   !== undefined) updates['settings.notifications.push']   = notifications.push;
    }
    if (privacy) {
      if (privacy.profileVisible  !== undefined) updates['settings.privacy.profileVisible']  = privacy.profileVisible;
      if (privacy.showContactInfo !== undefined) updates['settings.privacy.showContactInfo'] = privacy.showContactInfo;
    }
    if (preferences) {
      if (preferences.language !== undefined) {
        updates['settings.preferences.language'] = preferences.language;
        updates['preferredLanguage'] = preferences.language; // keep in sync
      }
      if (preferences.timezone !== undefined) updates['settings.preferences.timezone'] = preferences.timezone;
    }
    if (broker) {
      if (broker.commissionRate     !== undefined) updates['settings.broker.commissionRate']     = broker.commissionRate;
      if (broker.autoAcceptListings !== undefined) updates['settings.broker.autoAcceptListings'] = broker.autoAcceptListings;
      if (broker.autoRenewListings  !== undefined) updates['settings.broker.autoRenewListings']  = broker.autoRenewListings;
      if (broker.allowNegotiation   !== undefined) updates['settings.broker.allowNegotiation']   = broker.allowNegotiation;
    }
    if (userPrefs) {
      if (userPrefs.saveSearchHistory !== undefined) updates['settings.user.saveSearchHistory'] = userPrefs.saveSearchHistory;
      if (userPrefs.maxBudget         !== undefined) updates['settings.user.maxBudget']         = userPrefs.maxBudget;
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('settings').lean();

    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, settings: updated.settings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
