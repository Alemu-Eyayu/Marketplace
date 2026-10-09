import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import client from '../api/client';
import i18n from '../i18n';

export default function Profile() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [form, setForm] = useState({ fullName: '', bio: '', location: '', preferredLanguage: 'en' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        bio: user.bio || '',
        location: user.location || '',
        preferredLanguage: user.preferredLanguage || 'en',
      });
    }
  }, [user]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await client.put('/auth/me', { displayName: form.fullName, bio: form.bio, location: form.location, preferredLanguage: form.preferredLanguage });
      dispatch(setUser(data.user));
      i18n.changeLanguage(form.preferredLanguage);
      setSuccess(t('common.save'));
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await client.put('/auth/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      dispatch(setUser(data.user));
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  async function handleIdUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('idDoc', file);
    try {
      await client.post('/auth/upload-id', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('ID uploaded. Verification pending.');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) return setError(t('errors.passwordMismatch'));
    if (pwForm.newPassword.length < 8) return setError(t('errors.passwordTooShort'));
    try {
      await client.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSuccess(t('auth.passwordChanged'));
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  const verificationBadge = {
    none: { label: t('profile.verificationStatus.none'), cls: 'secondary' },
    pending: { label: t('profile.verificationStatus.pending'), cls: 'warning' },
    verified: { label: t('profile.verificationStatus.verified'), cls: 'success' },
    rejected: { label: t('profile.verificationStatus.rejected'), cls: 'danger' },
  }[user?.verificationStatus || 'none'];

  return (
    <div className="container py-4">
      <h2>{t('profile.edit')}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="mb-3">
        <span className={`badge bg-${verificationBadge.cls}`}>{verificationBadge.label}</span>
      </div>

      {/* Profile photo */}
      <div className="mb-3">
        {user?.profilePhoto && <img src={user.profilePhoto} alt="profile" className="rounded-circle mb-2" width={80} height={80} />}
        <div>
          <label className="btn btn-outline-secondary btn-sm">
            {t('profile.uploadPhoto')}
            <input type="file" accept="image/jpeg,image/png" hidden onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileSave} className="mb-4">
        <div className="mb-3">
          <label>{t('auth.fullName')}</label>
          <input className="form-control" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="mb-3">
          <label>{t('profile.bio')}</label>
          <textarea className="form-control" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="mb-3">
          <label>{t('profile.location')}</label>
          <input className="form-control" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="mb-3">
          <label>{t('profile.language')}</label>
          <select className="form-select" value={form.preferredLanguage} onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))}>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>{t('common.save')}</button>
      </form>

      {/* National ID upload */}
      <div className="mb-4">
        <h5>{t('profile.uploadId')}</h5>
        <label className="btn btn-outline-secondary btn-sm">
          {t('profile.uploadId')}
          <input type="file" accept="image/jpeg,image/png" hidden onChange={handleIdUpload} />
        </label>
      </div>

      {/* Change password */}
      <h5>{t('auth.currentPassword')}</h5>
      <form onSubmit={handlePasswordChange}>
        <div className="mb-3">
          <label>{t('auth.currentPassword')}</label>
          <input className="form-control" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
        </div>
        <div className="mb-3">
          <label>{t('auth.newPassword')}</label>
          <input className="form-control" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} required />
        </div>
        <div className="mb-3">
          <label>{t('auth.confirmPassword')}</label>
          <input className="form-control" type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
        </div>
        <button className="btn btn-warning" type="submit">{t('auth.resetPassword')}</button>
      </form>
    </div>
  );
}
