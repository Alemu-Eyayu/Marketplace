import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { fetchCompanyProfile } from '../store/companySlice';
import client from '../api/client';
import i18n from '../i18n';

// Phone input with +251 prefix
function PhoneInput({ value, onChange, name = 'phone' }) {
  const displayValue = value.startsWith('+251') ? value.slice(4) : value.startsWith('251') ? value.slice(3) : value.startsWith('0') ? value.slice(1) : value;
  function handleInput(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange({ target: { name, value: '+251' + digits } });
  }
  return (
    <div className="input-group">
      <span className="input-group-text fw-semibold" style={{ background: '#f8f9fa', letterSpacing: 1 }}>
        🇪🇹 +251
      </span>
      <input
        className="form-control"
        type="tel"
        name={name}
        value={displayValue}
        onChange={handleInput}
        placeholder="9 22 78 20 39"
        maxLength={9}
        required
        inputMode="numeric"
      />
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state } = useLocation();
  const [form, setForm] = useState({ phone: '+251', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState(state?.message || '');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', form);
      
      // Store refresh token in localStorage
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      
      // Load company profile immediately so navbar shows company name
      if (data.user?.role === 'company') {
        dispatch(fetchCompanyProfile('me'));
      }

      // Sync language preference
      if (data.user?.preferredLanguage) {
        i18n.changeLanguage(data.user.preferredLanguage);
      }

      // Redirect after login — admin goes to admin panel, everyone else to home
      const redirectTo = data.user?.role === 'admin' ? '/admin-panel' : '/';
      navigate(redirectTo);
    } catch (err) {
      // If phone not verified, redirect to OTP page
      if (err.response?.data?.requiresVerification) {
        navigate('/verify-otp', {
          state: { phone: err.response.data.phone, purpose: 'registration' },
        });
        return;
      }
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>{t('auth.login')}</h2>
      {info && <div className="alert alert-success">{info}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>{t('auth.phone')}</label>
          <PhoneInput value={form.phone} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label>{t('auth.password')}</label>
          <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn btn-primary w-100" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('auth.login')}
        </button>
      </form>
      <p className="mt-3 text-center">
        <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
        {' | '}
        <Link to="/register">{t('auth.register')}</Link>
      </p>
      <p className="mt-2 text-center">
        <Link to="/register-company">🏢 Register as a Company →</Link>
      </p>
    </div>
  );
}
