import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { setUser } from '../store/authSlice';
import client from '../api/client';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    bio: '',
    location: '',
    profilePhoto: null,
  });
  const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || null);

  // Password form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  // Language
  const [language, setLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    // Load current settings
    client.get('/auth/settings').then(({ data }) => {
      if (data.settings?.notifications) {
        setNotifications(data.settings.notifications);
      }
    }).catch(() => {});

    client.get('/auth/me').then(({ data }) => {
      if (data.user) {
        setProfile(p => ({
          ...p,
          fullName: data.user.fullName || '',
          bio: data.user.bio || '',
          location: data.user.location || '',
        }));
        setPhotoPreview(data.user.profilePhoto || null);
      }
    }).catch(() => {});
  }, []);

  function showSuccess(msg) {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  }

  // Save profile — uses PUT /auth/me (correct method)
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('displayName', profile.fullName);
      fd.append('bio', profile.bio);
      fd.append('location', profile.location);
      if (profile.profilePhoto) fd.append('profilePhoto', profile.profilePhoto);

      const { data } = await client.put('/auth/me', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.user) dispatch(setUser(data.user));
      showSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  // Change password — uses POST /auth/change-password (correct endpoint)
  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return setError('New passwords do not match.');
    }
    if (passwords.newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setSaving(true);
    setError('');
    try {
      await client.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  // Save notification settings
  async function handleSaveNotifications(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await client.put('/auth/settings', { notifications });
      showSuccess('Notification preferences saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  // Change language
  async function handleLanguageChange(lang) {
    setLanguage(lang);
    await i18n.changeLanguage(lang);
    try {
      await client.patch('/users/me/language', { language: lang });
    } catch { /* silent */ }
    showSuccess('Language updated.');
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setProfile(p => ({ ...p, profilePhoto: file }));
    setPhotoPreview(URL.createObjectURL(file));
  }

  const TABS = [
    { id: 'profile',       label: '👤 Profile',       icon: '👤' },
    { id: 'password',      label: '🔒 Password',       icon: '🔒' },
    { id: 'notifications', label: '🔔 Notifications',  icon: '🔔' },
    { id: 'language',      label: '🌐 Language',        icon: '🌐' },
    { id: 'subscription',  label: '⭐ Subscriptions',  icon: '⭐' },
  ];

  // Admin gets extra tab
  if (user?.role === 'admin') {
    TABS.push({ id: 'admin', label: '⚙️ Admin Panel', icon: '⚙️' });
  }

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <h4 className="fw-bold mb-4">⚙️ Settings</h4>

      {success && <div className="alert alert-success py-2">{success}</div>}
      {error   && <div className="alert alert-danger  py-2">{error}</div>}

      <div className="row g-4">

        {/* Sidebar tabs */}
        <div className="col-md-3">
          <div className="list-group">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span className="small fw-semibold">{tab.label.replace(/^.+ /, '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="col-md-9">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">

              {/* ── Profile ── */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile}>
                  <h5 className="fw-bold mb-4">Profile Information</h5>

                  {/* Avatar */}
                  <div className="d-flex align-items-center gap-3 mb-4">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile" className="rounded-circle" style={{ width: 72, height: 72, objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-circle bg-success d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 72, height: 72, fontSize: '1.5rem' }}>
                        {(user?.fullName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <label className="btn btn-sm btn-outline-secondary">
                        Change Photo
                        <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                      </label>
                      <div className="small text-muted mt-1">JPEG or PNG, max 5 MB</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input className="form-control" value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Bio</label>
                    <textarea className="form-control" rows={3} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell others about yourself..." />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Location</label>
                    <input className="form-control" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Addis Ababa" />
                  </div>

                  <div className="mb-3 p-3 bg-light rounded-3">
                    <div className="small text-muted mb-1">Phone</div>
                    <div className="fw-semibold">{user?.phone}</div>
                  </div>

                  <div className="mb-4 p-3 bg-light rounded-3">
                    <div className="small text-muted mb-1">Role</div>
                    <div className="fw-semibold text-capitalize">{user?.role}</div>
                  </div>

                  <button type="submit" className="btn btn-success px-4" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</> : 'Save Changes'}
                  </button>
                </form>
              )}

              {/* ── Password ── */}
              {activeTab === 'password' && (
                <form onSubmit={handleChangePassword}>
                  <h5 className="fw-bold mb-4">Change Password</h5>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Current Password</label>
                    <input type="password" className="form-control" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password</label>
                    <input type="password" className="form-control" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} required minLength={8} />
                    <div className="form-text">At least 8 characters</div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Confirm New Password</label>
                    <input type="password" className="form-control" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} required />
                  </div>

                  <button type="submit" className="btn btn-success px-4" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</> : 'Change Password'}
                  </button>
                </form>
              )}

              {/* ── Notifications ── */}
              {activeTab === 'notifications' && (
                <form onSubmit={handleSaveNotifications}>
                  <h5 className="fw-bold mb-4">Notification Preferences</h5>

                  {[
                    { key: 'email', label: '📧 Email Notifications', desc: 'Receive updates via email' },
                    { key: 'push',  label: '🔔 Push Notifications',  desc: 'In-app real-time alerts' },
                    { key: 'sms',   label: '📱 SMS Notifications',   desc: 'Text messages to your phone' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="d-flex justify-content-between align-items-center p-3 border rounded-3 mb-3">
                      <div>
                        <div className="fw-semibold">{label}</div>
                        <div className="small text-muted">{desc}</div>
                      </div>
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={notifications[key]}
                          onChange={e => setNotifications(n => ({ ...n, [key]: e.target.checked }))}
                          style={{ width: '2.5rem', height: '1.25rem' }}
                        />
                      </div>
                    </div>
                  ))}

                  <button type="submit" className="btn btn-success px-4 mt-2" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</> : 'Save Preferences'}
                  </button>
                </form>
              )}

              {/* ── Language ── */}
              {activeTab === 'language' && (
                <div>
                  <h5 className="fw-bold mb-4">Language / ቋንቋ</h5>

                  <div className="d-flex flex-column gap-3">
                    {[
                      { value: 'en', label: 'English', flag: '🇬🇧' },
                      { value: 'am', label: 'አማርኛ (Amharic)', flag: '🇪🇹' },
                    ].map(lang => (
                      <div
                        key={lang.value}
                        className={`d-flex align-items-center gap-3 p-3 border rounded-3 ${language === lang.value ? 'border-success bg-success bg-opacity-10' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleLanguageChange(lang.value)}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{lang.flag}</span>
                        <span className="fw-semibold">{lang.label}</span>
                        {language === lang.value && <span className="ms-auto text-success fw-bold">✓ Active</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Subscriptions ── */}
              {activeTab === 'subscription' && (
                <div>
                  <h5 className="fw-bold mb-4">My Subscriptions</h5>
                  <p className="text-muted mb-4">Manage your premium subscriptions to post listings in different categories.</p>
                  <Link to="/premium-subscription" className="btn btn-success px-4">
                    ⭐ Manage Subscriptions
                  </Link>
                </div>
              )}

              {/* ── Admin Panel (admin only) ── */}
              {activeTab === 'admin' && user?.role === 'admin' && (
                <div>
                  <h5 className="fw-bold mb-4">Admin Panel</h5>
                  <p className="text-muted mb-4">Access the full admin dashboard to manage users, listings, companies, and subscriptions.</p>
                  <Link to="/admin-panel" className="btn btn-danger px-4">
                    ⚙️ Open Admin Panel
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
