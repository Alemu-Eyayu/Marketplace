import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import client from '../api/client';

// ── Inline card/metric helpers (previously in BaseDashboard) ─────────────────

function DashboardCard({ title, children, className = '', headerActions = null, loading = false }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">{title}</h5>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="card-body position-relative">
        {loading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light bg-opacity-75" style={{ zIndex: 10 }}>
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon = null, color = 'primary', loading = false }) {
  return (
    <DashboardCard className="text-center" loading={loading}>
      {icon && <div className={`text-${color} mb-2`}><i className={`${icon} fs-1`}></i></div>}
      <div className={`text-${color} fw-bold`} style={{ fontSize: '2rem' }}>{loading ? '…' : value}</div>
      <div className="text-muted">{title}</div>
    </DashboardCard>
  );
}

// ── Inline settings panel (previously SettingsComponent) ─────────────────────

function AdminSettingsPanel({ settings, onSettingsChange }) {
  const { i18n } = useTranslation();
  const [local, setLocal] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (settings) setLocal(settings); }, [settings]);

  function change(category, key, value) {
    setLocal((prev) => ({ ...prev, [category]: { ...prev[category], [key]: value } }));
  }

  async function handleSave() {
    setError(''); setSuccess(false); setSaving(true);
    try {
      const { data } = await client.put('/auth/settings', local);
      if (local.preferences?.language) i18n.changeLanguage(local.preferences.language);
      if (onSettingsChange) onSettingsChange(data.settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold">Admin Settings</h5>
        <button className="btn btn-primary btn-sm px-4" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save'}
        </button>
      </div>
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 small mb-3">Settings saved.</div>}

      <div className="card mb-3">
        <div className="card-header py-2"><h6 className="mb-0 fw-semibold">Notifications</h6></div>
        <div className="card-body py-3">
          {[{ key: 'email', label: 'Email notifications' }, { key: 'sms', label: 'SMS notifications' }, { key: 'push', label: 'Push notifications' }].map(({ key, label }) => (
            <div key={key} className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id={`notif-${key}`}
                checked={local.notifications?.[key] ?? false}
                onChange={(e) => change('notifications', key, e.target.checked)} />
              <label className="form-check-label small" htmlFor={`notif-${key}`}>{label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2"><h6 className="mb-0 fw-semibold">Admin Preferences</h6></div>
        <div className="card-body py-3">
          <div className="form-check mb-2">
            <input className="form-check-input" type="checkbox" id="systemNotifications"
              checked={local.admin?.systemNotifications ?? true}
              onChange={(e) => change('admin', 'systemNotifications', e.target.checked)} />
            <label className="form-check-label small" htmlFor="systemNotifications">System alert notifications</label>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2"><h6 className="mb-0 fw-semibold">Language</h6></div>
        <div className="card-body py-3">
          <select className="form-select form-select-sm"
            value={local.preferences?.language || 'en'}
            onChange={(e) => change('preferences', 'language', e.target.value)}>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary w-100 fw-semibold" onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Settings'}
      </button>
    </div>
  );
}

const TABS = ['overview', 'users', 'listings', 'verifications', 'reports', 'subscriptions', 'analytics', 'categories', 'settings'];


export default function AdminPanel() {
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    systemMetrics: {
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
      activeListings: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      pendingVerifications: 0,
      openReports: 0,
      pendingListings: 0,
      pendingCompanies: 0,
    },
    users: [],
    listings: [],
    companies: [],
    verifications: [],
    reports: [],
    analytics: null,
    categories: [],
    recentActivity: [],
    systemHealth: {
      database: 'healthy',
      api: 'healthy',
      storage: 'warning'
    }
  });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ nameEn: '', nameAm: '', slug: '', editId: null });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [listingsFilter, setListingsFilter] = useState('pending');
  const [userSettings, setUserSettings] = useState(null);

  useEffect(() => {
    loadTabData();
  }, [tab]);

  useEffect(() => {
    client.get('/auth/settings')
      .then(({ data }) => setUserSettings(data.settings))
      .catch(() => setUserSettings({
        notifications: { email: true, sms: false, push: true },
        privacy: { profileVisible: true, showContactInfo: false },
        admin: { systemNotifications: true },
        preferences: { language: 'en', timezone: 'Africa/Addis_Ababa' },
      }));
  }, []);

  const loadTabData = async () => {
    setError('');
    setLoading(true);
    
    try {
      if (tab === 'overview') {
        // Load system overview metrics
        const [usersRes, listingsRes, transactionsRes, verificationsRes, reportsRes, pendingListingsRes, pendingCompaniesRes] = await Promise.all([
          client.get('/admin/users?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          client.get('/admin/listings?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          client.get('/admin/analytics').catch(() => ({ data: { analytics: {} } })),
          client.get('/admin/verifications?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          client.get('/admin/reports?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          client.get('/admin/listings/pending?limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
          client.get('/admin/companies?verificationStatus=pending&limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
        ]);

        setDashboardData(prev => ({
          ...prev,
          systemMetrics: {
            totalUsers: usersRes.data.pagination?.total || 0,
            activeUsers: transactionsRes.data.analytics?.users?.active || 0,
            totalListings: listingsRes.data.pagination?.total || 0,
            activeListings: transactionsRes.data.analytics?.listings?.active || 0,
            pendingVerifications: verificationsRes.data.pagination?.total || 0,
            openReports: reportsRes.data.pagination?.total || 0,
            pendingListings: pendingListingsRes.data.pagination?.total || 0,
            pendingCompanies: pendingCompaniesRes.data.pagination?.total || 0,
          },
          recentActivity: [
            { id: 1, type: 'user', description: 'New user registered', timestamp: new Date() },
            { id: 2, type: 'listing', description: 'New listing created', timestamp: new Date(Date.now() - 3600000) },
            { id: 3, type: 'system', description: 'System backup completed', timestamp: new Date(Date.now() - 7200000) }
          ]
        }));
      } else if (tab === 'users') {
        const { data } = await client.get('/admin/users', { params: { q: search } });
        setDashboardData(prev => ({ ...prev, users: data.users }));
      } else if (tab === 'listings') {
        // Get ALL listings regardless of status
        const { data } = await client.get('/admin/listings');
        setDashboardData(prev => ({ ...prev, listings: data.listings }));
      } else if (tab === 'verifications') {
        const [verificationsRes, companiesRes] = await Promise.all([
          client.get('/admin/verifications'),
          client.get('/admin/companies').catch(() => ({ data: { companies: [] } })),
        ]);
        setDashboardData(prev => ({
          ...prev,
          verifications: verificationsRes.data.users || [],
          companies: companiesRes.data.companies || [],
        }));
      } else if (tab === 'reports') {
        const { data } = await client.get('/admin/reports');
        setDashboardData(prev => ({ ...prev, reports: data.reports }));
      } else if (tab === 'analytics') {
        const { data } = await client.get('/admin/analytics');
        setDashboardData(prev => ({ ...prev, analytics: data.analytics }));
      } else if (tab === 'categories') {
        const { data } = await client.get('/admin/categories');
        setDashboardData(prev => ({ ...prev, categories: data.categories }));
      } else if (tab === 'subscriptions') {
        const { data } = await client.get('/premium-subscriptions', { params: { status: 'pending', limit: 50 } });
        setDashboardData(prev => ({ ...prev, pendingSubscriptions: data.subscriptions || [] }));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (id) => {
    try { 
      await client.patch(`/admin/users/${id}/suspend`); 
      loadTabData(); 
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleReinstate = async (id) => {
    try { 
      await client.patch(`/admin/users/${id}/reinstate`); 
      loadTabData(); 
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}" and ALL their data (listings, messages, notifications, subscriptions)? This cannot be undone.`)) return;
    try { 
      await client.delete(`/admin/users/${id}`); 
      loadTabData(); 
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleVerify = async (id, action) => {
    try { 
      await client.patch(`/admin/verifications/${id}`, { action }); 
      loadTabData(); 
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleReport = async (id, action) => {
    try { 
      await client.patch(`/admin/reports/${id}`, { action }); 
      loadTabData(); 
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      if (newCat.editId) {
        // Edit existing category
        await client.put(`/admin/categories/${newCat.editId}`, {
          name: { en: newCat.nameEn, am: newCat.nameAm },
        });
      } else {
        // Create new category
        await client.post('/admin/categories', {
          name: { en: newCat.nameEn, am: newCat.nameAm },
          slug: newCat.slug,
        });
      }
      setNewCat({ nameEn: '', nameAm: '', slug: '', editId: null });
      loadTabData();
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  // Listing approval handlers
  const handleViewListing = (listing) => {
    setDetailItem({ ...listing, contentType: 'listing' });
    setShowDetailModal(true);
  };

  const handleApproveListing = async (id) => {
    try {
      await client.patch(`/admin/listings/${id}/approve`);
      setShowDetailModal(false);
      setDetailItem(null);
      loadTabData();
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleRejectListing = (id) => {
    setRejectTarget({ type: 'listing', id });
    setShowRejectModal(true);
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Permanently delete this listing and all its media? This cannot be undone.')) return;
    try {
      await client.delete(`/admin/listings/${id}`);
      setShowDetailModal(false);
      setDetailItem(null);
      loadTabData();
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  // Generic reject handler
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      const endpoint = {
        listing: `/admin/listings/${rejectTarget.id}/reject`,
        company: `/admin/companies/${rejectTarget.id}/reject`,
      }[rejectTarget.type];

      await client.patch(endpoint, { reason: rejectionReason });
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectionReason('');
      setShowDetailModal(false);
      setDetailItem(null);
      loadTabData();
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  };

  const handleExport = () => {
    // Navigate to analytics tab which has the proper authenticated export
    setTab('analytics');
  };

  const handleSettingsChange = (newSettings) => {
    setUserSettings(newSettings);
  };

  const quickActions = [
    {
      label: 'Export Data',
      icon: 'bi bi-download',
      variant: 'btn-outline-primary',
      onClick: handleExport
    },
    {
      label: 'System Health',
      icon: 'bi bi-heart-pulse',
      variant: 'btn-outline-success',
      onClick: () => setTab('overview')
    }
  ];

  const SystemOverview = () => {
    const m = dashboardData.systemMetrics;
    const statCards = [
      { label: 'Total Users',      value: m.totalUsers,       icon: '👥', color: '#6366f1', bg: '#eef2ff', tab: 'users' },
      { label: 'Active Users',     value: m.activeUsers,      icon: '✅', color: '#22c55e', bg: '#f0fdf4', tab: 'users' },
      { label: 'Total Listings',   value: m.totalListings,    icon: '📋', color: '#0ea5e9', bg: '#f0f9ff', tab: 'listings' },
      { label: 'Active Listings',  value: m.activeListings,   icon: '🟢', color: '#16a34a', bg: '#dcfce7', tab: 'listings' },
      { label: 'Pending Listings', value: m.pendingListings,  icon: '⏳', color: '#f97316', bg: '#fff7ed', tab: 'listings' },
      { label: 'Pending Companies',value: m.pendingCompanies, icon: '🏢', color: '#ef4444', bg: '#fef2f2', tab: 'verifications' },
      { label: 'Pending Verifications', value: m.pendingVerifications, icon: '🔍', color: '#8b5cf6', bg: '#f5f3ff', tab: 'verifications' },
      { label: 'Open Reports',     value: m.openReports,      icon: '🚨', color: '#ec4899', bg: '#fdf2f8', tab: 'reports' },
    ];

    const healthItems = [
      { label: 'Database',      sub: 'Connection status',    status: 'Healthy', variant: 'success' },
      { label: 'API Response',  sub: 'Avg response time',    status: '125ms',   variant: 'success' },
      { label: 'Storage',       sub: 'Disk usage',           status: '78%',     variant: 'warning' },
    ];

    const actionItems = [
      { label: 'Pending Companies',     sub: 'Company registrations',  count: m.pendingCompanies,    countColor: 'danger',  tab: 'verifications' },
      { label: 'Pending Verifications', sub: 'All user verifications', count: m.pendingVerifications, countColor: 'warning', tab: 'verifications' },
      { label: 'Open Reports',          sub: 'Content moderation',     count: m.openReports,         countColor: 'danger',  tab: 'reports' },
      { label: 'Pending Listings',      sub: 'Awaiting approval',      count: m.pendingListings,     countColor: 'warning', tab: 'listings' },
    ];

    return (
      <div>
        {/* ── Stat Cards ── */}
        <div className="row g-3 mb-4">
          {statCards.map((s) => (
            <div key={s.label} className="col-6 col-md-3">
              <div
                className="rounded-3 p-3 h-100 d-flex align-items-center gap-3"
                style={{
                  background: s.bg,
                  border: `1.5px solid ${s.color}22`,
                  cursor: s.tab ? 'pointer' : 'default',
                  transition: 'box-shadow 0.15s',
                }}
                onClick={() => s.tab && setTab(s.tab)}
                onMouseEnter={(e) => s.tab && (e.currentTarget.style.boxShadow = `0 4px 16px ${s.color}33`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div
                  className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 48, height: 48, background: `${s.color}18`, fontSize: '1.4rem' }}
                >
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className="fw-bold" style={{ fontSize: '1.4rem', color: s.color, lineHeight: 1.1 }}>
                    {loading ? '…' : s.value}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.78rem', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom Row: System Health + Pending Actions ── */}
        <div className="row g-3">
          {/* System Health */}
          <div className="col-md-5">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-header bg-white border-bottom fw-semibold d-flex align-items-center gap-2">
                <span>🖥️</span> System Health
              </div>
              <div className="card-body p-0">
                {healthItems.map((h, i) => (
                  <div
                    key={h.label}
                    className="d-flex align-items-center justify-content-between px-4 py-3"
                    style={{ borderBottom: i < healthItems.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                  >
                    <div>
                      <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{h.label}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{h.sub}</div>
                    </div>
                    <span className={`badge bg-${h.variant} rounded-pill px-3`}>{h.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          <div className="col-md-7">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-header bg-white border-bottom fw-semibold d-flex align-items-center gap-2">
                <span>⚡</span> Pending Actions
              </div>
              <div className="card-body p-0">
                {actionItems.map((a, i) => (
                  <div
                    key={a.label}
                    className="d-flex align-items-center justify-content-between px-4 py-3"
                    style={{ borderBottom: i < actionItems.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                  >
                    <div>
                      <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{a.label}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{a.sub}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`badge bg-${a.countColor} rounded-pill`}
                        style={{ minWidth: 28, textAlign: 'center' }}
                      >
                        {loading ? '…' : a.count}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-primary rounded-pill px-3"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => setTab(a.tab)}
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Analytics Tab ──────────────────────────────────────────────────────────
  const AnalyticsTab = () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);

    const PRESETS = [
      { label: 'Today',      start: fmt(today),                                                    end: fmt(today) },
      { label: 'This Week',  start: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())), end: fmt(today) },
      { label: 'This Month', start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),        end: fmt(today) },
      { label: 'This Year',  start: fmt(new Date(today.getFullYear(), 0, 1)),                       end: fmt(today) },
      { label: 'All Time',   start: '2020-01-01',                                                   end: fmt(today) },
    ];

    const [startDate, setStartDate] = React.useState(fmt(today));
    const [endDate,   setEndDate]   = React.useState(fmt(today));
    const [activePreset, setActivePreset] = React.useState('Today');
    const [data, setData]   = React.useState(null);
    const [busy, setBusy]   = React.useState(false);
    const [activeList, setActiveList] = React.useState('users'); // 'users' | 'listings' | 'subs'

    const load = React.useCallback(async (s, e) => {
      setBusy(true);
      try {
        const res = await client.get('/admin/analytics', { params: { startDate: s, endDate: e } });
        setData(res.data);
      } catch { /* silent */ }
      finally { setBusy(false); }
    }, []);

    React.useEffect(() => { load(startDate, endDate); }, []);

    function applyPreset(p) {
      setActivePreset(p.label);
      setStartDate(p.start);
      setEndDate(p.end);
      load(p.start, p.end);
    }

    function applyCustom() {
      setActivePreset('Custom');
      load(startDate, endDate);
    }

    function handleExportCSV() {
      const token = localStorage.getItem('accessToken');
      const url = `${API_BASE}/admin/analytics/export?startDate=${startDate}&endDate=${endDate}`;
      // Fetch with auth header then trigger download
      client.get('/admin/analytics/export', {
        params: { startDate, endDate },
        responseType: 'blob',
      }).then(res => {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_${startDate}_to_${endDate}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      }).catch(() => {});
    }

    const ps = data?.period_stats || {};
    const at = data?.allTime || {};
    const lists = data?.lists || {};

    const StatBox = ({ label, value, color, bg }) => (
      <div className="rounded-3 p-3 text-center" style={{ background: bg, border: `1px solid ${color}33` }}>
        <div className="fw-bold" style={{ fontSize: '1.5rem', color }}>{value}</div>
        <div className="small text-muted mt-1">{label}</div>
      </div>
    );

    return (
      <div>
        {/* ── Period selector ── */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body p-3">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  className={`btn btn-sm rounded-pill ${activePreset === p.label ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex align-items-center gap-1">
                <label className="small text-muted mb-0">From</label>
                <input type="date" className="form-control form-control-sm" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 150 }} />
              </div>
              <div className="d-flex align-items-center gap-1">
                <label className="small text-muted mb-0">To</label>
                <input type="date" className="form-control form-control-sm" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 150 }} />
              </div>
              <button className="btn btn-sm btn-primary rounded-pill px-3" onClick={applyCustom} disabled={busy}>
                {busy ? <span className="spinner-border spinner-border-sm"></span> : '🔍 Apply'}
              </button>
              <button className="btn btn-sm btn-outline-success rounded-pill px-3 ms-auto" onClick={handleExportCSV} disabled={busy}>
                <i className="bi bi-download me-1"></i>Export CSV
              </button>
            </div>
          </div>
        </div>

        {busy && <div className="text-center py-4"><div className="spinner-border text-success"></div></div>}

        {data && !busy && (
          <>
            {/* ── Period summary cards ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              📅 Period: {startDate} → {endDate}
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3"><StatBox label="New Users"     value={ps.newUsers ?? 0}                              color="#6366f1" bg="#eef2ff" /></div>
              <div className="col-6 col-md-3"><StatBox label="New Listings"  value={ps.newListings ?? 0}                           color="#0ea5e9" bg="#f0f9ff" /></div>
              <div className="col-6 col-md-3"><StatBox label="New Subs"      value={ps.newSubs ?? 0}                               color="#8b5cf6" bg="#f5f3ff" /></div>
              <div className="col-6 col-md-3"><StatBox label="Period Revenue" value={`${(ps.periodRevenue ?? 0).toLocaleString()} ETB`} color="#16a34a" bg="#dcfce7" /></div>
            </div>

            {/* ── All-time totals ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              📊 All-Time Totals
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-2"><StatBox label="Total Users"    value={at.users?.total ?? 0}                                    color="#6366f1" bg="#eef2ff" /></div>
              <div className="col-6 col-md-2"><StatBox label="Active Users"   value={at.users?.active ?? 0}                                   color="#22c55e" bg="#f0fdf4" /></div>
              <div className="col-6 col-md-2"><StatBox label="Total Listings" value={at.listings?.total ?? 0}                                  color="#0ea5e9" bg="#f0f9ff" /></div>
              <div className="col-6 col-md-2"><StatBox label="Active Listings" value={at.listings?.active ?? 0}                               color="#22c55e" bg="#f0fdf4" /></div>
              <div className="col-6 col-md-2"><StatBox label="Active Subs"    value={at.subscriptions?.active ?? 0}                           color="#8b5cf6" bg="#f5f3ff" /></div>
              <div className="col-6 col-md-2"><StatBox label="Total Revenue"  value={`${(at.subscriptions?.totalRevenue ?? 0).toLocaleString()} ETB`} color="#16a34a" bg="#dcfce7" /></div>
            </div>

            {/* ── Top categories bar chart ── */}
            {at.listings?.topCategories?.length > 0 && (
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-body p-3">
                  <div className="fw-semibold mb-3" style={{ fontSize: '0.85rem' }}>📋 Listings by Category</div>
                  <div className="d-flex flex-column gap-2">
                    {at.listings.topCategories.map((cat, i) => {
                      const pct = at.listings.total > 0 ? Math.round((cat.count / at.listings.total) * 100) : 0;
                      return (
                        <div key={cat.category} className="d-flex align-items-center gap-2">
                          <div className="text-muted" style={{ width: 20, fontSize: '0.72rem' }}>#{i+1}</div>
                          <div className="text-capitalize" style={{ width: 170, fontSize: '0.8rem', fontWeight: 600 }}>{cat.category.replace(/-/g,' ')}</div>
                          <div className="flex-grow-1 bg-light rounded-pill overflow-hidden" style={{ height: 10 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#0ea5e9', borderRadius: 99 }}></div>
                          </div>
                          <div className="text-muted" style={{ width: 70, fontSize: '0.75rem', textAlign: 'right' }}>{cat.count} ({pct}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Detailed lists ── */}
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-0">
                {/* Tab switcher */}
                <div className="d-flex border-bottom">
                  {[
                    { key: 'users',    label: `👥 Users (${lists.users?.length ?? 0})` },
                    { key: 'listings', label: `📋 Listings (${lists.listings?.length ?? 0})` },
                    { key: 'subs',     label: `⭐ Subscriptions (${lists.subs?.length ?? 0})` },
                  ].map(t => (
                    <button
                      key={t.key}
                      className={`btn btn-sm border-0 rounded-0 px-4 py-3 ${activeList === t.key ? 'border-bottom border-success border-2 fw-bold text-success' : 'text-muted'}`}
                      style={{ borderBottom: activeList === t.key ? '2px solid #16a34a' : '2px solid transparent' }}
                      onClick={() => setActiveList(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {/* Users list */}
                  {activeList === 'users' && (
                    lists.users?.length === 0
                      ? <p className="text-muted text-center py-3">No new users in this period.</p>
                      : <table className="table table-sm table-hover mb-0">
                          <thead className="table-light"><tr><th>Name</th><th>Role</th><th>Phone</th><th>Status</th><th>Registered</th></tr></thead>
                          <tbody>
                            {lists.users.map(u => (
                              <tr key={u._id}>
                                <td className="fw-semibold">{u.fullName}</td>
                                <td><span className="badge bg-light text-dark text-capitalize">{u.role}</span></td>
                                <td className="text-muted">{u.phone}</td>
                                <td><span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
                                <td className="text-muted small">{new Date(u.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                  )}

                  {/* Listings list */}
                  {activeList === 'listings' && (
                    lists.listings?.length === 0
                      ? <p className="text-muted text-center py-3">No new listings in this period.</p>
                      : <table className="table table-sm table-hover mb-0">
                          <thead className="table-light"><tr><th>Title</th><th>Category</th><th>Owner</th><th>Status</th><th>Price</th><th>Posted</th></tr></thead>
                          <tbody>
                            {lists.listings.map(l => (
                              <tr key={l._id}>
                                <td className="fw-semibold" style={{ maxWidth: 180 }}><span className="text-truncate d-block">{l.title}</span></td>
                                <td><span className="badge bg-light text-dark text-capitalize" style={{ fontSize: '0.7rem' }}>{l.categorySlug?.replace(/-/g,' ')}</span></td>
                                <td className="text-muted small">{l.owner?.fullName}</td>
                                <td><span className={`badge ${l.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{l.status}</span></td>
                                <td className="text-muted small">{l.price?.toLocaleString()} ETB</td>
                                <td className="text-muted small">{new Date(l.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                  )}

                  {/* Subscriptions list */}
                  {activeList === 'subs' && (
                    lists.subs?.length === 0
                      ? <p className="text-muted text-center py-3">No subscriptions in this period.</p>
                      : <table className="table table-sm table-hover mb-0">
                          <thead className="table-light"><tr><th>User</th><th>Category</th><th>Duration</th><th>Fee</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
                          <tbody>
                            {lists.subs.map(s => (
                              <tr key={s._id}>
                                <td className="fw-semibold">{s.user?.fullName}</td>
                                <td><span className="badge bg-light text-dark text-capitalize" style={{ fontSize: '0.7rem' }}>{s.categorySlug?.replace(/-/g,' ')}</span></td>
                                <td className="text-capitalize">{s.duration}</td>
                                <td className="text-success fw-semibold">{s.fee?.toLocaleString()} ETB</td>
                                <td><span className={`badge ${s.status === 'active' ? 'bg-success' : s.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{s.status}</span></td>
                                <td className="text-muted small text-uppercase">{s.paymentMethod}</td>
                                <td className="text-muted small">{new Date(s.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Reusable verification section for broker / individual ──────────────────
  const VerificationSection = ({ title, role, onVerify, setError: setErr }) => {
    const [users, setUsers] = React.useState([]);
    const [statusFilter, setStatusFilter] = React.useState('');
    const [busy, setBusy] = React.useState(true);

    const load = React.useCallback(async (status) => {
      setBusy(true);
      try {
        const params = { role };
        if (status) params.status = status;
        const { data } = await client.get('/admin/verifications', { params });
        setUsers(data.users || []);
      } catch { setUsers([]); }
      finally { setBusy(false); }
    }, [role]);

    React.useEffect(() => { load(''); }, []);

    function handleFilter(e) {
      const val = e.target.value;
      setStatusFilter(val);
      load(val);
    }

    return (
      <DashboardCard
        title={title}
        className="mb-4"
        headerActions={
          <select className="form-select form-select-sm" style={{ width: 160 }} value={statusFilter} onChange={handleFilter}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        }
        loading={busy}
      >
        {users.length === 0 ? (
          <p className="text-muted text-center py-3">No {statusFilter || ''} {role === 'user' ? 'individual' : role} verifications found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr><th>Name</th><th>Phone</th><th>Document</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold">{u.fullName}</td>
                    <td>{u.phone}</td>
                    <td>
                      {u.verificationDoc
                        ? <a href={u.verificationDoc} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">View Document</a>
                        : <span className="text-muted small">No doc uploaded</span>
                      }
                    </td>
                    <td>
                      <span className={`badge bg-${u.verificationStatus === 'verified' ? 'success' : u.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>
                        {u.verificationStatus}
                      </span>
                    </td>
                    <td><small className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</small></td>
                    <td>
                      {u.verificationStatus === 'pending' ? (
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-success" onClick={async () => { await onVerify(u._id, 'approve'); load(statusFilter); }}>✓ Approve</button>
                          <button className="btn btn-outline-danger"  onClick={async () => { await onVerify(u._id, 'reject');  load(statusFilter); }}>✗ Reject</button>
                        </div>
                      ) : <span className="text-muted small">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    );
  };

  const renderTabContent = () => {
    switch (tab) {
      case 'overview':
        return <SystemOverview />;
        
      case 'users':
        return (
          <DashboardCard 
            title="User Management"
            headerActions={
              <div className="d-flex align-items-center gap-2">
                <input 
                  className="form-control form-control-sm" 
                  placeholder="Search users..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '200px' }}
                />
                <button className="btn btn-outline-secondary btn-sm" onClick={loadTabData}>
                  Search
                </button>
              </div>
            }
            loading={loading}
          >
            <div className="dashboard-table-container">
              <table className="table dashboard-table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.users.map((u) => (
                    <tr key={u._id}>
                      <td>{u.fullName}</td>
                      <td>{u.phone}</td>
                      <td>
                        <span className="badge bg-secondary">{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge bg-${u.isActive ? 'success' : 'danger'}`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          {u.isActive ? (
                            <button className="btn btn-outline-warning btn-sm" onClick={() => handleSuspend(u._id)}>
                              Suspend
                            </button>
                          ) : (
                            <button className="btn btn-outline-success btn-sm" onClick={() => handleReinstate(u._id)}>
                              Reinstate
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(u._id, u.fullName)}
                            title="Permanently delete user and all their data"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        );

      case 'listings':
        const filteredListings = listingsFilter === 'all' 
          ? dashboardData.listings 
          : dashboardData.listings.filter(l => l.approvalStatus === listingsFilter);
        
        return (
          <DashboardCard 
            title="Listing Management"
            headerActions={
              <div className="d-flex align-items-center gap-2">
                <select 
                  className="form-select form-select-sm" 
                  value={listingsFilter}
                  onChange={(e) => setListingsFilter(e.target.value)}
                  style={{ width: '150px' }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Only</option>
                  <option value="approved">Approved Only</option>
                  <option value="rejected">Rejected Only</option>
                </select>
              </div>
            }
            loading={loading}
          >
            <div className="dashboard-table-container">
              <table className="table dashboard-table table-hover">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        {listingsFilter === 'all' && 'No listings found'}
                        {listingsFilter === 'pending' && 'No pending listings'}
                        {listingsFilter === 'approved' && 'No approved listings'}
                        {listingsFilter === 'rejected' && 'No rejected listings'}
                      </td>
                    </tr>
                  ) : (
                    filteredListings.map((listing) => (
                      <tr key={listing._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {listing.images?.[0] && (
                              <img 
                                src={listing.images[0]} 
                                alt={listing.title}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', marginRight: '8px' }}
                              />
                            )}
                            <span>{listing.title}</span>
                          </div>
                        </td>
                        <td>{listing.owner?.fullName}</td>
                        <td>
                          <span className="badge bg-secondary">{listing.category?.name?.en || listing.categorySlug}</span>
                        </td>
                        <td>{listing.price?.toLocaleString()} ETB</td>
                        <td>
                          <span className={`badge bg-${
                            listing.approvalStatus === 'approved' ? 'success' : 
                            listing.approvalStatus === 'rejected' ? 'danger' : 
                            'warning'
                          }`}>
                            {listing.approvalStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td>{new Date(listing.createdAt).toLocaleDateString()}</td>
                        <td>
                          {(!listing.approvalStatus || listing.approvalStatus === 'pending') && (
                            <button 
                              className="btn btn-sm btn-primary me-1" 
                              onClick={() => handleViewListing(listing)}
                            >
                              View Details
                            </button>
                          )}
                          {listing.approvalStatus === 'approved' && (
                            <span className="text-success me-2">✓ Approved</span>
                          )}
                          {listing.approvalStatus === 'rejected' && (
                            <div className="d-inline me-2">
                              <span className="text-danger">✗ Rejected</span>
                              <small className="text-muted d-block mt-1">
                                {listing.rejectionReason}
                              </small>
                            </div>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteListing(listing._id)}
                            title="Delete listing permanently"
                          >
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        );

      case 'verifications':
        return (
          <div>
            {/* ── Section 1: Company Verification ── */}
            <DashboardCard
              title="🏢 Company Verification"
              className="mb-4"
              headerActions={
                <select
                  className="form-select form-select-sm"
                  style={{ width: 160 }}
                  onChange={async (e) => {
                    const params = e.target.value ? { verificationStatus: e.target.value } : {};
                    const { data } = await client.get('/admin/companies', { params }).catch(() => ({ data: { companies: [] } }));
                    setDashboardData(prev => ({ ...prev, companies: data.companies || [] }));
                  }}
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              }
              loading={loading}
            >
              {dashboardData.companies.length === 0 ? (
                <p className="text-muted text-center py-3">No companies found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr><th>Company</th><th>Industry</th><th>Reg. Number</th><th>Doc</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {dashboardData.companies.map((company) => (
                        <tr key={company._id}>
                          <td className="fw-semibold">{company.companyName}</td>
                          <td><span className="badge bg-light text-dark">{company.industry}</span></td>
                          <td><code className="small">{company.businessRegistrationNumber}</code></td>
                          <td>
                            {company.businessRegistrationDoc && (
                              <a href={company.businessRegistrationDoc} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">View Doc</a>
                            )}
                          </td>
                          <td>
                            <span className={`badge bg-${company.verificationStatus === 'verified' ? 'success' : company.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>
                              {company.verificationStatus}
                            </span>
                          </td>
                          <td><small className="text-muted">{new Date(company.createdAt).toLocaleDateString()}</small></td>
                          <td>
                            {company.verificationStatus === 'pending' ? (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-success" onClick={async () => { try { await client.patch(`/admin/companies/${company._id}/approve`); loadTabData(); } catch (err) { setError(err.response?.data?.message || 'Failed.'); } }}>✓ Approve</button>
                                <button className="btn btn-outline-danger" onClick={() => { setRejectTarget({ type: 'company', id: company._id }); setShowRejectModal(true); }}>✗ Reject</button>
                              </div>
                            ) : <span className="text-muted small">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardCard>

            {/* ── Section 2: Broker Verification ── */}
            <VerificationSection
              title="🏷️ Broker Verification"
              role="broker"
              onVerify={handleVerify}
              setError={setError}
            />

            {/* ── Section 3: Individual Verification ── */}
            <VerificationSection
              title="👤 Individual Verification"
              role="user"
              onVerify={handleVerify}
              setError={setError}
            />
          </div>
        );

      case 'reports':
        return (
          <DashboardCard title="Content Reports" loading={loading}>
            <div className="dashboard-table-container">
              <table className="table dashboard-table table-hover">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.reports.map((r) => (
                    <tr key={r._id}>
                      <td>
                        <span className="badge bg-info">{r.targetType}</span>
                      </td>
                      <td>{r.reason}</td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-danger" onClick={() => handleReport(r._id, 'action')}>
                            Take Action
                          </button>
                          <button className="btn btn-secondary" onClick={() => handleReport(r._id, 'dismiss')}>
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        );

      case 'subscriptions':
        return (
          <DashboardCard title="Premium Subscription Requests" loading={loading}>
            {(!dashboardData.pendingSubscriptions || dashboardData.pendingSubscriptions.length === 0) ? (
              <div className="text-center py-4 text-muted">
                <div style={{ fontSize: '2.5rem' }}>📋</div>
                <p className="mt-2">No pending subscription requests.</p>
              </div>
            ) : (
              <div className="dashboard-table-container">
                <table className="table dashboard-table table-hover">
                  <thead>
                    <tr>
                      <th>Subscriber</th>
                      <th>Role</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Payment</th>
                      <th>Fee (ETB)</th>
                      <th>Receipt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.pendingSubscriptions.map((sub) => (
                      <tr key={sub._id}>
                        <td>
                          <div className="fw-semibold small">{sub.user?.fullName}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{sub.user?.phone}</div>
                        </td>
                        <td><span className="badge bg-secondary text-capitalize">{sub.user?.role}</span></td>
                        <td className="small">{sub.categorySlug}</td>
                        <td className="text-capitalize small">{sub.duration}</td>
                        <td className="text-uppercase small">{sub.paymentMethod}</td>
                        <td className="fw-semibold">{sub.fee?.toLocaleString()}</td>
                        <td>
                          <a href={sub.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                            View
                          </a>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-success"
                              onClick={async () => {
                                try {
                                  await client.patch(`/premium-subscriptions/${sub._id}/activate`);
                                  loadTabData();
                                } catch (e) {
                                  setError(e.response?.data?.message || 'Failed');
                                }
                              }}
                            >
                              Activate
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={async () => {
                                const reason = window.prompt('Rejection reason:');
                                if (!reason) return;
                                try {
                                  await client.patch(`/premium-subscriptions/${sub._id}/reject`, { reason });
                                  loadTabData();
                                } catch (e) {
                                  setError(e.response?.data?.message || 'Failed');
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3">
              <a href="/admin-subscriptions" className="btn btn-outline-primary btn-sm">
                Open Full Subscription Manager →
              </a>
            </div>
          </DashboardCard>
        );

      case 'analytics':
        return <AnalyticsTab />;

      case 'categories':
        return (
          <DashboardCard title="Category Management" loading={loading}>
            {/* Add / Edit form */}
            <form onSubmit={handleCreateCategory} className="row g-2 mb-4 p-3 bg-light rounded">
              <div className="col">
                <input
                  className="form-control"
                  placeholder="Name (EN) *"
                  value={newCat.nameEn}
                  onChange={(e) => setNewCat((c) => ({ ...c, nameEn: e.target.value }))}
                  required
                />
              </div>
              <div className="col">
                <input
                  className="form-control"
                  placeholder="Name (AM)"
                  value={newCat.nameAm}
                  onChange={(e) => setNewCat((c) => ({ ...c, nameAm: e.target.value }))}
                />
              </div>
              <div className="col">
                <input
                  className="form-control"
                  placeholder="Slug *"
                  value={newCat.slug}
                  onChange={(e) => setNewCat((c) => ({ ...c, slug: e.target.value }))}
                  required
                  disabled={!!newCat.editId}
                />
              </div>
              <div className="col-auto d-flex gap-2">
                <button className="btn btn-primary" type="submit">
                  {newCat.editId ? '💾 Save' : '+ Add'}
                </button>
                {newCat.editId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setNewCat({ nameEn: '', nameAm: '', slug: '', editId: null })}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="dashboard-table-container">
              <table className="table dashboard-table table-hover">
                <thead>
                  <tr>
                    <th>Name (EN)</th>
                    <th>Name (AM)</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.categories.map((c) => (
                    <tr key={c._id}>
                      <td className="fw-semibold">{c.name?.en || c.name}</td>
                      <td className="text-muted">{c.name?.am || '—'}</td>
                      <td><code>{c.slug}</code></td>
                      <td>
                        <span className={`badge bg-${c.isActive ? 'success' : 'secondary'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {/* Edit */}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Edit"
                            onClick={() => setNewCat({
                              nameEn: c.name?.en || c.name || '',
                              nameAm: c.name?.am || '',
                              slug: c.slug,
                              editId: c._id,
                            })}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {/* Toggle status */}
                          <button
                            className={`btn btn-sm ${c.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                            title={c.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() =>
                              client.patch(`/admin/categories/${c._id}/status`, { isActive: !c.isActive })
                                .then(loadTabData)
                                .catch((err) => setError(err.response?.data?.message || 'Failed to update status.'))
                            }
                          >
                            <i className={`bi ${c.isActive ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                          </button>
                          {/* Delete */}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete"
                            onClick={async () => {
                              if (!window.confirm(`Delete category "${c.name?.en || c.slug}"? This cannot be undone.`)) return;
                              try {
                                await client.delete(`/admin/categories/${c._id}`);
                                loadTabData();
                              } catch (err) {
                                setError(err.response?.data?.message || 'Failed to delete category.');
                              }
                            }}
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        );

      case 'settings':
        return (
          <DashboardCard title="Admin Settings" loading={loading}>
            <AdminSettingsPanel
              settings={userSettings}
              onSettingsChange={handleSettingsChange}
            />
          </DashboardCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">Admin Panel</h2>
          <small className="text-muted">{user?.fullName}</small>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={handleExport}>
            <i className="bi bi-download me-1"></i>Export Data
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={() => setTab('overview')}>
            <i className="bi bi-heart-pulse me-1"></i>System Health
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={loadTabData} title="Refresh">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger alert-dismissible mb-4">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="dashboard-tabs mb-4">
        <ul className="nav nav-tabs">
          {TABS.map((t) => (
            <li key={t} className="nav-item">
              <button 
                className={`nav-link ${tab === t ? 'active' : ''}`} 
                onClick={() => setTab(t)}
              >
                {t === 'verifications' ? 'Verifications' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="row g-4">
        <div className="col-12">
          {renderTabContent()}
        </div>
      </div>

      {/* Detail View Modal */}
      {showDetailModal && detailItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: '90%' }}>
            <div className="modal-content" style={{ maxHeight: '90vh' }}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {detailItem.contentType === 'listing' && '📋 Listing Details'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowDetailModal(false);
                    setDetailItem(null);
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
                {/* Listing Details */}
                {detailItem.contentType === 'listing' && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6>Title</h6>
                        <p className="fw-bold fs-5">{detailItem.title}</p>
                      </div>
                      <div className="col-md-6">
                        <h6>Price</h6>
                        <p className="fw-bold fs-5 text-success">{detailItem.price?.toLocaleString()} {detailItem.currency || 'ETB'}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6>Category</h6>
                        <p><span className="badge bg-secondary">{detailItem.category?.name?.en || detailItem.categorySlug}</span></p>
                      </div>
                      <div className="col-md-6">
                        <h6>Owner</h6>
                        <p>{detailItem.owner?.fullName} ({detailItem.owner?.phone})</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <h6>Description</h6>
                      <div style={{ 
                        whiteSpace: 'pre-wrap', 
                        padding: '15px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px',
                        fontSize: '16px',
                        lineHeight: '1.6'
                      }}>
                        {detailItem.description}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h6>Location</h6>
                      <p>
                        {detailItem.location?.city && `${detailItem.location.city}, `}
                        {detailItem.location?.region && detailItem.location.region}
                        {detailItem.location?.address && (
                          <><br /><small className="text-muted">{detailItem.location.address}</small></>
                        )}
                      </p>
                    </div>
                    
                    {/* Category-specific details */}
                    {detailItem.realEstate && (
                      <div className="mb-3">
                        <h6>Property Details</h6>
                        <div className="row">
                          {detailItem.realEstate.propertyType && (
                            <div className="col-md-6"><small><strong>Type:</strong> {detailItem.realEstate.propertyType}</small></div>
                          )}
                          {detailItem.realEstate.sizeSqm && (
                            <div className="col-md-6"><small><strong>Size:</strong> {detailItem.realEstate.sizeSqm} sqm</small></div>
                          )}
                          {detailItem.realEstate.bedrooms && (
                            <div className="col-md-6"><small><strong>Bedrooms:</strong> {detailItem.realEstate.bedrooms}</small></div>
                          )}
                          {detailItem.realEstate.bathrooms && (
                            <div className="col-md-6"><small><strong>Bathrooms:</strong> {detailItem.realEstate.bathrooms}</small></div>
                          )}
                          {detailItem.realEstate.furnishingStatus && (
                            <div className="col-md-6"><small><strong>Furnishing:</strong> {detailItem.realEstate.furnishingStatus}</small></div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {detailItem.automotive && (
                      <div className="mb-3">
                        <h6>Vehicle Details</h6>
                        <div className="row">
                          {detailItem.automotive.make && (
                            <div className="col-md-6"><small><strong>Make:</strong> {detailItem.automotive.make}</small></div>
                          )}
                          {detailItem.automotive.model && (
                            <div className="col-md-6"><small><strong>Model:</strong> {detailItem.automotive.model}</small></div>
                          )}
                          {detailItem.automotive.year && (
                            <div className="col-md-6"><small><strong>Year:</strong> {detailItem.automotive.year}</small></div>
                          )}
                          {detailItem.automotive.mileage && (
                            <div className="col-md-6"><small><strong>Mileage:</strong> {detailItem.automotive.mileage} km</small></div>
                          )}
                          {detailItem.automotive.condition && (
                            <div className="col-md-6"><small><strong>Condition:</strong> {detailItem.automotive.condition}</small></div>
                          )}
                          {detailItem.automotive.fuelType && (
                            <div className="col-md-6"><small><strong>Fuel:</strong> {detailItem.automotive.fuelType}</small></div>
                          )}
                          {detailItem.automotive.transmission && (
                            <div className="col-md-6"><small><strong>Transmission:</strong> {detailItem.automotive.transmission}</small></div>
                          )}
                          {detailItem.automotive.color && (
                            <div className="col-md-6"><small><strong>Color:</strong> {detailItem.automotive.color}</small></div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {detailItem.images && detailItem.images.length > 0 && (
                      <div className="mb-3">
                        <h6>Images ({detailItem.images.length})</h6>
                        <div className="d-flex flex-column gap-3">
                          {detailItem.images.map((img, idx) => (
                            <img 
                              key={idx}
                              src={img} 
                              alt={`Image ${idx + 1}`}
                              style={{ 
                                width: '100%', 
                                maxHeight: '500px', 
                                objectFit: 'contain', 
                                borderRadius: '8px',
                                backgroundColor: '#000'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {detailItem.video && (
                      <div className="mb-3">
                        <h6>Video</h6>
                        <video 
                          controls 
                          style={{ 
                            width: '100%', 
                            maxHeight: '500px', 
                            borderRadius: '8px',
                            backgroundColor: '#000'
                          }}
                        >
                          <source src={detailItem.video} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6>Status</h6>
                        <p><span className="badge bg-info">{detailItem.status}</span></p>
                      </div>
                      <div className="col-md-6">
                        <h6>Views</h6>
                        <p>{detailItem.viewCount || 0}</p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h6>Created At</h6>
                      <p>{new Date(detailItem.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {/* Post Details */}
                {/* Community Details */}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowDetailModal(false);
                    setDetailItem(null);
                  }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-danger"
                  onClick={() => handleDeleteListing(detailItem._id)}
                >
                  🗑 Delete
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => {
                    setShowDetailModal(false);
                    if (detailItem.contentType === 'listing') {
                      handleRejectListing(detailItem._id);
                    }
                  }}
                >
                  Reject
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={() => {
                    if (detailItem.contentType === 'listing') {
                      handleApproveListing(detailItem._id);
                    }
                  }}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject Content</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectTarget(null);
                    setRejectionReason('');
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rejection Reason *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this content is being rejected..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectTarget(null);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}