import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { phone });
      setSuccess(t('auth.otpSent'));
      setTimeout(() => navigate('/reset-password', { state: { phone } }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>{t('auth.forgotPassword')}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>{t('auth.phone')}</label>
          <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <button className="btn btn-primary w-100" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('common.submit')}
        </button>
      </form>
      <p className="mt-3 text-center"><Link to="/login">{t('auth.login')}</Link></p>
    </div>
  );
}
