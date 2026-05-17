import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

export default function VerifyOTP() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const phone = state?.phone || '';
  const purpose = state?.purpose || 'registration';
  const devOtp = state?.devOtp || null;

  const [otp, setOtp] = useState(devOtp || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/verify-otp', { phone, otp, purpose });
      setSuccess(t('auth.otpVerified'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.invalidOtp'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    try {
      await client.post('/auth/resend-otp', { phone, purpose });
      setSuccess(t('auth.otpSent'));
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  return (
    <div className="auth-container">
      <h2>{t('auth.verifyOtp')}</h2>
      {devOtp && (
        <div className="alert alert-info d-flex align-items-center gap-2">
          <span>🔑</span>
          <span>Dev mode — your OTP is: <strong style={{ letterSpacing: 3, fontSize: '1.1rem' }}>{devOtp}</strong></span>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>{t('auth.otp')}</label>
          <input className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
        </div>
        <button className="btn btn-primary w-100" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('auth.verifyOtp')}
        </button>
      </form>
      <p className="mt-3 text-center">
        <button className="btn btn-link" onClick={handleResend}>{t('auth.resendOtp')}</button>
      </p>
    </div>
  );
}
