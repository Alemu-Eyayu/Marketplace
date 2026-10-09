'use strict';

const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

/**
 * File filter that only allows JPEG and PNG images.
 */
function imageFileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG and PNG images are allowed.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for profile photo uploads.
 * Memory storage, JPEG/PNG only, max 2 MB.
 */
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

/**
 * Multer instance for National ID / verification document uploads.
 * Memory storage, JPEG/PNG only, max 5 MB.
 */
const idDocUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * File filter for broker license documents: JPEG, PNG, or PDF.
 */
function brokerLicenseFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG, PNG, or PDF files are allowed.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for broker license document uploads.
 * Memory storage, JPEG/PNG/PDF, max 10 MB.
 */
const brokerLicenseUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: brokerLicenseFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * File filter for listing media: JPEG/PNG for images, MP4 for video.
 * Also checks file sizes: images max 10MB, videos max 50MB.
 */
function listingMediaFileFilter(req, file, cb) {
  if (file.fieldname === 'images') {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only JPEG and PNG images are allowed.'), { status: 422 }), false);
    }
  } else if (file.fieldname === 'video') {
    const allowedVideo = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedVideo.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only MP4, MOV, AVI or WebM video is allowed.'), { status: 422 }), false);
    }
  } else {
    cb(Object.assign(new Error('Unexpected field.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for listing media uploads.
 * Memory storage, JPEG/PNG images (max 10 MB each, up to 10), MP4 video (max 50 MB, up to 1).
 */
const listingMediaUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: listingMediaFileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100 MB to accommodate larger videos
    files: 11 // 10 images + 1 video
  },
});

/**
 * File filter for message attachments: images and documents.
 */
function attachmentFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Unsupported file type.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for message attachment uploads.
 * Memory storage, image/document, max 10 MB.
 */
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: attachmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * File filter for social media posts: images and videos.
 */
function socialMediaFileFilter(req, file, cb) {
  const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideos = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  
  if (allowedImages.includes(file.mimetype) || allowedVideos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for social media uploads.
 * Memory storage, images and videos, max 100 MB per file, up to 5 files.
 */
const socialMediaUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: socialMediaFileFilter,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100 MB per file
    files: 5 // Max 5 files per post
  },
});

/**
 * File filter for company registration documents: JPEG, PNG, PDF.
 */
function companyDocFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG, PNG, or PDF files are allowed.'), { status: 422 }), false);
  }
}

/**
 * Multer instance for company registration document uploads.
 * Memory storage, JPEG/PNG/PDF, max 10 MB.
 */
const companyDocUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: companyDocFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * Multer instance for company logo/coverPhoto uploads.
 * Memory storage, JPEG/PNG only, max 5 MB.
 */
const companyLogoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Multer instance for broker registration — accepts both licenseDoc and nationalId.
 * Memory storage, JPEG/PNG/PDF, max 10 MB each.
 */
const brokerRegistrationUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: brokerLicenseFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
});

module.exports = {
  profilePhotoUpload,
  idDocUpload,
  brokerLicenseUpload,
  brokerRegistrationUpload,
  listingMediaUpload,
  attachmentUpload,
  socialMediaUpload,
  companyDocUpload,
  companyLogoUpload,
  upload: socialMediaUpload,
};
