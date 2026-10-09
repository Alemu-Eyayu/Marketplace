import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useLocation();
  const phone = state?.phone || '';
  const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) return setError(t('errors.passwordMismatch'));
    if (form.newPassword.length < 8) return setError(t('errors.passwordTooShort'));
    setLoading(true);
    try {
      await client.post('/auth/reset-password', { phone, otp: form.otp, newPassword: form.newPassword });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>{t('auth.resetPassword')}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>{t('auth.otp')}</label>
          <input className="form-control" name="otp" value={form.otp} onChange={handleChange} maxLength={6} required />
        </div>
        <div className="mb-3">
          <label>{t('auth.newPassword')}</label>
          <input className="form-control" type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label>{t('auth.confirmPassword')}</label>
          <input className="form-control" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required />
        </div>
        <button className="btn btn-primary w-100" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('auth.resetPassword')}
        </button>
      </form>
      <p className="mt-3 text-center"><Link to="/login">{t('auth.login')}</Link></p>
    </div>
  );
}
