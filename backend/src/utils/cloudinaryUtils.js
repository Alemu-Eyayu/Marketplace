'use strict';

/**
 * Extract the Cloudinary public_id from a secure URL.
 * e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/ethiogebiya/listings/abc.jpg
 *      => ethiogebiya/listings/abc
 */
function extractPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    // Strip version segment (v\d+/) if present
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    // Strip file extension
    return afterUpload.replace(/\.[^/.]+$/, '');
  } catch (_) {
    return null;
  }
}

module.exports = { extractPublicId };
