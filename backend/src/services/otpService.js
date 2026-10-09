'use strict';

const axios = require('axios');
const getRedisClient = require('../config/redis');

const TTL = {
  registration: 86400,    // 24 hours (in seconds)
  'password-reset': 900,  // 15 minutes
};

const AFRO_BASE = 'https://api.afromessage.com/api';

function redisKey(purpose, phone) {
  return `otp:${purpose}:${normalizePhone(phone)}`;
}

/**
 * Normalize Ethiopian phone to +251XXXXXXXXX format.
 * Afromessage always stores/verifies using the +251 format.
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  const p = String(phone).trim().replace(/\s+/g, '');
  if (p.startsWith('+251')) return p;
  if (p.startsWith('251'))  return '+' + p;
  if (p.startsWith('0'))    return '+251' + p.slice(1);
  return '+251' + p;
}

/**
 * Send OTP via Afromessage /api/challenge endpoint.
 * Afromessage generates the code, sends it, and handles expiry.
 * We store the verificationId in Redis so we can verify later.
 *
 * Returns the OTP code only in dev mode (no token set).
 */
async function sendOtp(phone, purpose) {
  const ttl = TTL[purpose];
  if (!ttl) throw new Error(`Unknown OTP purpose: ${purpose}`);

  const token      = process.env.AFROMESSAGE_TOKEN;
  const identifier = process.env.AFROMESSAGE_IDENTIFIER;
  const normalizedPhone = normalizePhone(phone);

  // ── Dev mode: no token set ────────────────────────────────────────────────
  if (!token) {
    const crypto = require('crypto');
    let value;
    do { value = crypto.randomInt(0, 1000000); } while (value >= 1000000);
    const otp = String(value).padStart(6, '0');

    const redis = getRedisClient();
    await redis.set(redisKey(purpose, phone), otp, 'EX', ttl);

    console.log(`[OTP] Dev mode — OTP for ${normalizedPhone} (${purpose}): ${otp}`);
    return otp;
  }

  // ── Production: use Afromessage /api/challenge ────────────────────────────
  const params = new URLSearchParams({
    to:  normalizedPhone,
    len: '6',
    t:   '0',       // numeric only
    ttl: String(ttl),
    pr:  'Your EthioGebiya verification code is:',
    sb:  '1',
    sa:  '0',
  });

  if (identifier) params.set('from', identifier);
  // 'sender' omitted — requires approved sender name (paid plan)

  let response;
  try {
    response = await axios.get(
      `${AFRO_BASE}/challenge?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[OTP] Afromessage challenge error:', detail);
    throw new Error(`SMS send failed: ${JSON.stringify(detail)}`);
  }

  if (response.data?.acknowledge !== 'success') {
    console.error('[OTP] Afromessage challenge failed:', response.data);
    throw new Error(`SMS send failed: ${JSON.stringify(response.data)}`);
  }

  // Store verificationId in Redis (always overwrite with latest)
  const verificationId = response.data.response?.verificationId;
  console.log(`[OTP] Sent to ${normalizedPhone}, verificationId: ${verificationId}`);

  const redis = getRedisClient();
  await redis.set(redisKey(purpose, phone), verificationId || 'sent', 'EX', ttl);

  return null;
}

/**
 * Verify OTP.
 * Dev mode: compare against stored code in Redis.
 * Production: use Afromessage /api/verify with verificationId from Redis.
 */
async function verifyOtp(phone, purpose, code) {
  const token = process.env.AFROMESSAGE_TOKEN;
  const normalizedPhone = normalizePhone(phone);
  const redis = getRedisClient();
  const stored = await redis.get(redisKey(purpose, phone));

  // ── Dev mode ──────────────────────────────────────────────────────────────
  if (!token) {
    if (!stored) return false;
    return stored === String(code);
  }

  // ── Production: verify via Afromessage using verificationId + code ────────
  if (!stored) {
    console.error('[OTP] No verificationId in Redis for', normalizedPhone, purpose);
    return false;
  }

  console.log(`[OTP] Verifying ${normalizedPhone} with vc=${stored} code=${code}`);
  try {
    const params = new URLSearchParams({
      to:   normalizedPhone,
      vc:   stored,          // verificationId stored during sendOtp
      code: String(code),
    });

    const response = await axios.get(
      `${AFRO_BASE}/verify?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    console.log('[OTP] Afromessage verify response:', response.data);
    return response.data?.acknowledge === 'success';
  } catch (err) {
    console.error('[OTP] Afromessage verify error:', err.response?.data || err.message);
    return false;
  }
}

/**
 * Invalidate OTP — delete from Redis.
 */
async function invalidateOtp(phone, purpose) {
  const redis = getRedisClient();
  await redis.del(redisKey(purpose, phone));
}

module.exports = { sendOtp, verifyOtp, invalidateOtp };
