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

const TABS = ['users', 'listings', 'verifications', 'reports', 'subscriptions', 'analytics', 'chats', 'categories', 'settings'];


// ── Reports Tab Component ─────────────────────────────────────────────────────

const ACTION_TYPES = [
  { key: 'warn_owner',     label: 'Warn Owner',      variant: 'warning',   icon: '⚠️' },
  { key: 'remove_listing', label: 'Remove Listing',  variant: 'danger',    icon: '🗑️' },
  { key: 'suspend_owner',  label: 'Suspend Owner',   variant: 'dark',      icon: '🚫' },
  { key: 'dismiss',        label: 'Dismiss',         variant: 'secondary', icon: '✖' },
];

const STATUS_BADGE = {
  open:      { label: 'Open',      bg: 'danger'  },
  actioned:  { label: 'Actioned',  bg: 'success' },
  dismissed: { label: 'Dismissed', bg: 'secondary' },
};

const ACTION_LABEL = {
  warn_owner:     'Warned owner',
  remove_listing: 'Listing removed',
  suspend_owner:  'Owner suspended',
  dismiss:        'Dismissed',
};

function ReportsTab({ listingReports, messageReports, loading, onAction, statusFilter, onStatusFilterChange, onViewUser }) {
  const [expandedId, setExpandedId] = React.useState(null);
  const [noteMap, setNoteMap]       = React.useState({});
  const [acting, setActing]         = React.useState(null);
  const [reporterDetail, setReporterDetail] = React.useState(null); // { user, busy }

  async function loadReporter(userId) {
    setReporterDetail({ user: null, busy: true });
    try {
      const { data } = await client.get(`/admin/users`);
      // find from already-loaded list or fetch individually via search
      const found = data.users?.find(u => u._id === userId);
      if (found) { setReporterDetail({ user: found, busy: false }); return; }
    } catch { /* fall through */ }
    // fallback: search by id
    try {
      const { data } = await client.get('/admin/users', { params: { q: userId } });
      setReporterDetail({ user: data.users?.[0] || null, busy: false });
    } catch { setReporterDetail({ user: null, busy: false }); }
  }

  // Pick the first individual report id for a grouped card (used to call the API)
  function firstReportId(group) {
    return group.reports?.[0]?._id;
  }

  async function doAction(group, actionType) {
    const id = firstReportId(group);
    if (!id) return;
    const note = noteMap[id] || '';
    if (['remove_listing', 'suspend_owner'].includes(actionType)) {
      const label = ACTION_TYPES.find(a => a.key === actionType)?.label;
      if (!window.confirm(`Are you sure you want to "${label}" for listing "${group.listing?.title}"? This cannot be undone.`)) return;
    }
    setActing(id);
    await onAction(id, actionType, note);
    setActing(null);
  }

  const allGroups = listingReports || [];

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
        <span className="fw-semibold text-muted small me-1">Filter:</span>
        {['open', 'actioned', 'dismissed', 'all'].map(s => (
          <button
            key={s}
            className={`btn btn-sm rounded-pill ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => onStatusFilterChange(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ms-auto text-muted small">{allGroups.length} listing{allGroups.length !== 1 ? 's' : ''} reported</span>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && allGroups.length === 0 && (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '3rem' }}>🛡️</div>
          <p className="mt-2 fw-semibold">No {statusFilter === 'all' ? '' : statusFilter} reports.</p>
        </div>
      )}

      {/* ── Listing report cards ── */}
      {!loading && allGroups.map((group) => {
        const isExpanded = expandedId === group.listingId;
        const badge      = STATUS_BADGE[group.status] || STATUS_BADGE.open;
        const firstId    = firstReportId(group);

        return (
          <div key={group.listingId} className="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
            {/* Card header */}
            <div className="card-header bg-white border-bottom d-flex align-items-start gap-3 py-3">
              {/* Thumbnail */}
              {group.listing?.images?.[0] ? (
                <img
                  src={group.listing.images[0]}
                  alt="listing"
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center bg-light rounded-2 flex-shrink-0"
                  style={{ width: 64, height: 64, fontSize: '1.8rem' }}
                >
                  📋
                </div>
              )}

              {/* Listing info */}
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <span className="fw-bold" style={{ fontSize: '0.95rem' }}>
                    {group.listing?.title || <span className="text-muted fst-italic">Listing deleted</span>}
                  </span>
                  <span className={`badge bg-${badge.bg} rounded-pill`}>{badge.label}</span>
                  <span className="badge bg-danger rounded-pill">
                    🚨 {group.reportCount} report{group.reportCount !== 1 ? 's' : ''}
                  </span>
                  {group.listing?.status === 'removed' && (
                    <span className="badge bg-dark rounded-pill">Removed</span>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-3 small text-muted">
                  <span>
                    <strong>Category:</strong> {group.listing?.categorySlug || '—'}
                  </span>
                  <span>
                    <strong>Price:</strong> {group.listing?.price?.toLocaleString() || '—'} {group.listing?.currency || 'ETB'}
                  </span>
                  <span>
                    <strong>Owner:</strong> {group.listingOwner?.fullName || '—'}
                    {group.listingOwner?.phone && <span className="ms-1 text-muted">({group.listingOwner.phone})</span>}
                    {group.listingOwner?.role && (
                      <span className="badge bg-secondary ms-1 text-capitalize" style={{ fontSize: '0.65rem' }}>
                        {group.listingOwner.role}
                      </span>
                    )}
                  </span>
                  <span>
                    <strong>First reported:</strong> {new Date(group.firstReportAt).toLocaleDateString()}
                  </span>
                  <span>
                    <strong>Latest:</strong> {new Date(group.latestReportAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Resolution info */}
                {group.status !== 'open' && (
                  <div className="mt-2 p-2 rounded-2 small" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    <strong>Action taken:</strong> {ACTION_LABEL[group.actionType] || group.actionType}
                    {group.actionBy?.fullName && <span className="ms-2 text-muted">by {group.actionBy.fullName}</span>}
                    {group.actionAt && <span className="ms-2 text-muted">on {new Date(group.actionAt).toLocaleDateString()}</span>}
                    {group.adminNote && <div className="mt-1 text-muted fst-italic">"{group.adminNote}"</div>}
                  </div>
                )}
              </div>

              {/* Expand toggle */}
              <button
                className="btn btn-sm btn-outline-secondary rounded-pill flex-shrink-0"
                onClick={() => setExpandedId(isExpanded ? null : group.listingId)}
              >
                {isExpanded ? '▲ Hide' : `▼ ${group.reportCount} reporter${group.reportCount !== 1 ? 's' : ''}`}
              </button>
            </div>

            {/* Expanded: individual reporters */}
            {isExpanded && (
              <div className="card-body p-0">
                <div className="px-3 pt-3 pb-1">
                  <h6 className="fw-semibold text-muted small text-uppercase mb-2" style={{ letterSpacing: '0.06em' }}>
                    Individual Reports
                  </h6>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.82rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Reporter</th>
                        <th>Role</th>
                        <th>Phone</th>
                        <th>Reason</th>
                        <th>Date</th>
                        <th>Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.reports.map((r) => (
                        <tr key={r._id}>
                          <td className="ps-3 fw-semibold">{r.reporter?.fullName || '—'}</td>
                          <td>
                            <span className="badge bg-secondary text-capitalize" style={{ fontSize: '0.65rem' }}>
                              {r.reporter?.role || '—'}
                            </span>
                          </td>
                          <td className="text-muted">{r.reporter?.phone || '—'}</td>
                          <td>{r.reason}</td>
                          <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td>
                            {r.reporter?._id && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                onClick={() => onViewUser(r.reporter._id)}
                              >
                                👤 View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action bar — only for open reports */}
            {group.status === 'open' && (
              <div className="card-footer bg-white border-top d-flex align-items-center gap-2 flex-wrap py-2 px-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Optional admin note…"
                  style={{ maxWidth: 260 }}
                  value={noteMap[firstId] || ''}
                  onChange={(e) => setNoteMap(prev => ({ ...prev, [firstId]: e.target.value }))}
                />
                {ACTION_TYPES.map(({ key, label, variant, icon }) => (
                  <button
                    key={key}
                    className={`btn btn-sm btn-${variant}`}
                    disabled={acting === firstId}
                    onClick={() => doAction(group, key)}
                  >
                    {acting === firstId ? <span className="spinner-border spinner-border-sm me-1" /> : `${icon} `}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Message reports ── */}
      {!loading && messageReports?.length > 0 && (
        <div className="mt-4">
          <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
            Message Reports ({messageReports.length})
          </h6>
          <div className="card border-0 shadow-sm rounded-3">
            <div className="table-responsive">
              <table className="table table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Reporter</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messageReports.map((r) => (
                    <tr key={r._id}>
                      <td className="ps-3">
                        <div className="fw-semibold">{r.reportedBy?.fullName || '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{r.reportedBy?.phone}</div>
                      </td>
                      <td>{r.reason}</td>
                      <td>
                        <span className={`badge bg-${STATUS_BADGE[r.status]?.bg || 'secondary'} rounded-pill`}>
                          {STATUS_BADGE[r.status]?.label || r.status}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td>
                        {r.status === 'open' && (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-warning btn-sm" onClick={() => onAction(r._id, 'warn_owner')}>Warn</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => onAction(r._id, 'dismiss')}>Dismiss</button>
                          </div>
                        )}
                        {r.status !== 'open' && (
                          <span className="text-muted small">{ACTION_LABEL[r.actionType] || r.actionType}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState('users');
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
    listingReports: [],
    messageReports: [],
    reportsPagination: {},
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
  const [reportsStatusFilter, setReportsStatusFilter] = useState('open');
  const [subsStatusFilter, setSubsStatusFilter] = useState('pending');
  const [userSettings, setUserSettings] = useState(null);

  useEffect(() => {
    loadTabData();
  }, [tab]);

  // Re-fetch reports whenever the status filter changes (only while on reports tab)
  useEffect(() => {
    if (tab === 'reports') loadTabData(reportsStatusFilter);
  }, [reportsStatusFilter]);

  // Re-fetch subscriptions whenever the status filter changes
  useEffect(() => {
    if (tab === 'subscriptions') loadTabData(null, subsStatusFilter);
  }, [subsStatusFilter]);

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

  const loadTabData = async (reportStatus, subStatus) => {
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
        const status = reportStatus || reportsStatusFilter;
        const { data } = await client.get('/admin/reports', { params: { status } });
        setDashboardData(prev => ({
          ...prev,
          listingReports: data.listingReports || [],
          messageReports: data.messageReports || [],
          reportsPagination: data.pagination || {},
        }));
      } else if (tab === 'analytics') {
        const { data } = await client.get('/admin/analytics');
        setDashboardData(prev => ({ ...prev, analytics: data.analytics }));
      } else if (tab === 'categories') {
        const { data } = await client.get('/admin/categories');
        setDashboardData(prev => ({ ...prev, categories: data.categories }));
      } else if (tab === 'subscriptions') {
        const status = subStatus || subsStatusFilter;
        const { data } = await client.get('/premium-subscriptions', { params: { status, limit: 50 } });
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

  const handleReport = async (id, actionType, adminNote = '') => {
    try {
      await client.patch(`/admin/reports/${id}`, { actionType, ...(adminNote && { adminNote }) });
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

  const handleViewCompany = (company) => {
    setDetailItem({ ...company, contentType: 'company' });
    setShowDetailModal(true);
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
      onClick: () => setTab('analytics')
    }
  ];

  const SystemOverview = () => {
    const m = dashboardData.systemMetrics;
    const statCards = [
      { label: 'Total Users',      value: m.totalUsers,       icon: '👥', color: '#6366f1', bg: '#eef2ff', tab: 'users' },
      { label: 'Active Users',     value: m.activeUsers,      icon: '✅', color: '#22c55e', bg: '#f0fdf4', tab: 'users' },
      { label: 'Total Listings',   value: m.totalListings,    icon: '📋', color: '#0ea5e9', bg: '#f0f9ff', tab: 'listings' },
      { label: 'Active Listings',  value: m.activeListings,   icon: '🟢', color: '#16a34a', bg: '#dcfce7', tab: 'listings' },
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
              <div className="col-6 col-md-4"><StatBox label="New Users"    value={ps.newUsers ?? 0}    color="#6366f1" bg="#eef2ff" /></div>
              <div className="col-6 col-md-4"><StatBox label="New Listings" value={ps.newListings ?? 0} color="#0ea5e9" bg="#f0f9ff" /></div>
              <div className="col-6 col-md-4"><StatBox label="New Subs"     value={ps.newSubs ?? 0}     color="#8b5cf6" bg="#f5f3ff" /></div>
            </div>

            {/* ── All-time totals ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              📊 All-Time Totals
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3"><StatBox label="Total Users"    value={at.users?.total ?? 0}    color="#6366f1" bg="#eef2ff" /></div>
              <div className="col-6 col-md-3"><StatBox label="Active Users"   value={at.users?.active ?? 0}   color="#22c55e" bg="#f0fdf4" /></div>
              <div className="col-6 col-md-3"><StatBox label="Total Listings" value={at.listings?.total ?? 0}  color="#0ea5e9" bg="#f0f9ff" /></div>
              <div className="col-6 col-md-3"><StatBox label="Active Listings" value={at.listings?.active ?? 0} color="#22c55e" bg="#f0fdf4" /></div>
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

  // ── Chat History Tab ───────────────────────────────────────────────────────
  const ChatHistoryTab = () => {
    const [conversations, setConversations] = React.useState([]);
    const [total, setTotal]                 = React.useState(0);
    const [busy, setBusy]                   = React.useState(false);
    const [q, setQ]                         = React.useState('');
    const [selected, setSelected]           = React.useState(null); // conversation
    const [messages, setMessages]           = React.useState([]);
    const [msgBusy, setMsgBusy]             = React.useState(false);

    const load = React.useCallback(async (search = '') => {
      setBusy(true);
      try {
        const { data } = await client.get('/admin/conversations', { params: { q: search, limit: 50 } });
        setConversations(data.conversations || []);
        setTotal(data.pagination?.total || 0);
      } catch { /* silent */ }
      finally { setBusy(false); }
    }, []);

    React.useEffect(() => { load(); }, []);

    async function openConversation(conv) {
      setSelected(conv);
      setMsgBusy(true);
      try {
        const { data } = await client.get(`/admin/conversations/${conv._id}/messages`);
        setMessages(data.messages || []);
      } catch { setMessages([]); }
      finally { setMsgBusy(false); }
    }

    return (
      <div>
        {/* ── Header ── */}
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <h5 className="mb-0 fw-bold">💬 Chat History</h5>
          <span className="badge bg-secondary rounded-pill">{total} conversations</span>
          <div className="d-flex gap-2 ms-auto">
            <input
              className="form-control form-control-sm"
              placeholder="Search by user name or phone…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(q)}
              style={{ width: 240 }}
            />
            <button className="btn btn-sm btn-primary" onClick={() => load(q)} disabled={busy}>Search</button>
            {q && <button className="btn btn-sm btn-outline-secondary" onClick={() => { setQ(''); load(''); }}>Clear</button>}
          </div>
        </div>

        <div className="row g-3">
          {/* ── Conversation list ── */}
          <div className={selected ? 'col-md-4' : 'col-12'}>
            {busy && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}
            {!busy && conversations.length === 0 && (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: '3rem' }}>💬</div>
                <p className="mt-2">No conversations found.</p>
              </div>
            )}
            {!busy && conversations.map(conv => {
              const [p1, p2] = conv.participants || [];
              const isActive = selected?._id === conv._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => openConversation(conv)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 12,
                    border: `1.5px solid ${isActive ? '#16a34a' : '#e5e7eb'}`,
                    background: isActive ? '#f0fdf4' : '#fff',
                    padding: '12px 14px',
                    marginBottom: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>
                      {p1?.fullName || '—'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>↔</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>
                      {p2?.fullName || '—'}
                    </span>
                  </div>
                  {conv.listing && (
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 4 }}>
                      📋 {conv.listing.title}
                    </div>
                  )}
                  {conv.lastMessage && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong>{conv.lastMessage.sender?.fullName}:</strong> {conv.lastMessage.body || '[attachment]'}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 4 }}>
                    {new Date(conv.updatedAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Message thread ── */}
          {selected && (
            <div className="col-md-8">
              <div className="card border-0 shadow-sm rounded-3" style={{ height: 560, display: 'flex', flexDirection: 'column' }}>
                {/* Thread header */}
                <div className="card-header bg-white border-bottom d-flex align-items-center gap-3 py-3">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(null)}>← Back</button>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                      {selected.participants?.map(p => p.fullName).join(' ↔ ')}
                    </div>
                    {selected.listing && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>📋 {selected.listing.title}</div>
                    )}
                  </div>
                  <span className="ms-auto badge bg-secondary rounded-pill">{messages.length} messages</span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {msgBusy && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}
                  {!msgBusy && messages.length === 0 && (
                    <div className="text-center text-muted py-4">No messages in this conversation.</div>
                  )}
                  {!msgBusy && messages.map(msg => {
                    const isFirst = selected.participants?.[0]?._id === msg.sender?._id;
                    return (
                      <div key={msg._id} style={{ display: 'flex', justifyContent: isFirst ? 'flex-start' : 'flex-end' }}>
                        <div style={{
                          maxWidth: '70%',
                          background: isFirst ? '#f3f4f6' : '#dcfce7',
                          borderRadius: isFirst ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                          padding: '8px 12px',
                        }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', marginBottom: 3 }}>
                            {msg.sender?.fullName}
                          </div>
                          {msg.body && <div style={{ fontSize: '0.85rem', color: '#111' }}>{msg.body}</div>}
                          {msg.attachment && (
                            <a href={msg.attachment} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#16a34a' }}>📎 Attachment</a>
                          )}
                          <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
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

    function handleViewUser(u) {
      setDetailItem({ ...u, contentType: 'user' });
      setShowDetailModal(true);
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
                <tr><th>Name</th><th>Phone</th><th>Status</th><th>Phone Verified</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="fw-semibold">{u.fullName}</td>
                    <td>{u.phone}</td>
                    <td>
                      <span className={`badge bg-${u.verificationStatus === 'verified' ? 'success' : u.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>
                        {u.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${u.isPhoneVerified ? 'success' : 'secondary'}`}>
                        {u.isPhoneVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td><small className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</small></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-info" onClick={() => handleViewUser(u)}>👁 View</button>
                        {u.verificationStatus === 'pending' && (
                          <>
                            <button className="btn btn-outline-success" onClick={async () => { await onVerify(u._id, 'approve'); load(statusFilter); }}>✓ Approve</button>
                            <button className="btn btn-outline-danger"  onClick={async () => { await onVerify(u._id, 'reject');  load(statusFilter); }}>✗ Reject</button>
                          </>
                        )}
                      </div>
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
                          {/* Never show suspend/delete for admin accounts or self */}
                          {u.role !== 'admin' && u._id !== user?._id && (
                            <>
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
                            </>
                          )}
                          {(u.role === 'admin' || u._id === user?._id) && (
                            <span className="text-muted small fst-italic">—</span>
                          )}
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
        return (
          <DashboardCard
            title="Listing Management"
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
                  {dashboardData.listings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">No listings found</td>
                    </tr>
                  ) : (
                    dashboardData.listings.map((listing) => (
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
                          <span className={`badge bg-${listing.status === 'active' ? 'success' : listing.status === 'expired' ? 'secondary' : 'warning'}`}>
                            {listing.status}
                          </span>
                        </td>
                        <td>{new Date(listing.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteListing(listing._id)}
                              title="Delete listing permanently"
                            >
                              🗑 Delete
                            </button>
                          </div>
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
                      <tr><th>Company</th><th>Industry</th><th>Reg. Number</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {dashboardData.companies.map((company) => (
                        <tr key={company._id}>
                          <td className="fw-semibold">{company.companyName}</td>
                          <td><span className="badge bg-light text-dark">{company.industry}</span></td>
                          <td><code className="small">{company.businessRegistrationNumber}</code></td>
                          <td>
                            <span className={`badge bg-${company.verificationStatus === 'verified' ? 'success' : company.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>
                              {company.verificationStatus}
                            </span>
                          </td>
                          <td><small className="text-muted">{new Date(company.createdAt).toLocaleDateString()}</small></td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-info" onClick={() => handleViewCompany(company)}>👁 View</button>
                              {company.verificationStatus === 'pending' && (
                                <>
                                  <button className="btn btn-outline-success" onClick={async () => { try { await client.patch(`/admin/companies/${company._id}/approve`); loadTabData(); } catch (err) { setError(err.response?.data?.message || 'Failed.'); } }}>✓ Approve</button>
                                  <button className="btn btn-outline-danger" onClick={() => { setRejectTarget({ type: 'company', id: company._id }); setShowRejectModal(true); }}>✗ Reject</button>
                                </>
                              )}
                            </div>
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
          <ReportsTab
            listingReports={dashboardData.listingReports}
            messageReports={dashboardData.messageReports}
            loading={loading}
            onAction={handleReport}
            statusFilter={reportsStatusFilter}
            onStatusFilterChange={setReportsStatusFilter}
            onViewUser={async (userId) => {
              try {
                const { data } = await client.get('/admin/users', { params: { q: userId } });
                const u = data.users?.find(x => x._id === userId) || data.users?.[0];
                if (u) { setDetailItem({ ...u, contentType: 'user' }); setShowDetailModal(true); }
              } catch { /* silent */ }
            }}
          />
        );

      case 'subscriptions':
        return (
          <DashboardCard title="Premium Subscription Requests" loading={loading}>
            {/* ── Filter bar ── */}
            <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <span className="fw-semibold text-muted small me-1">Filter:</span>
              {[
                { key: 'pending',  label: '⏳ Pending',  variant: 'warning'   },
                { key: 'active',   label: '✅ Activated', variant: 'success'   },
                { key: 'rejected', label: '❌ Rejected',  variant: 'danger'    },
                { key: 'all',      label: '📋 All',       variant: 'secondary' },
              ].map(({ key, label, variant }) => (
                <button
                  key={key}
                  className={`btn btn-sm rounded-pill ${subsStatusFilter === key ? `btn-${variant}` : `btn-outline-${variant}`}`}
                  onClick={() => setSubsStatusFilter(key)}
                >
                  {label}
                </button>
              ))}
              <span className="ms-auto text-muted small">
                {dashboardData.pendingSubscriptions?.length || 0} result{dashboardData.pendingSubscriptions?.length !== 1 ? 's' : ''}
              </span>
            </div>

            {(!dashboardData.pendingSubscriptions || dashboardData.pendingSubscriptions.length === 0) ? (
              <div className="text-center py-4 text-muted">
                <div style={{ fontSize: '2.5rem' }}>📋</div>
                <p className="mt-2">No {subsStatusFilter === 'all' ? '' : subsStatusFilter} subscription requests.</p>
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
                      <th>Status</th>
                      <th>Date</th>
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
                          {sub.status === 'pending'  && <span className="badge bg-warning text-dark rounded-pill">Pending</span>}
                          {sub.status === 'active'   && <span className="badge bg-success rounded-pill">Active</span>}
                          {sub.status === 'rejected' && (
                            <span className="badge bg-danger rounded-pill" title={sub.rejectionReason}>Rejected</span>
                          )}
                          {sub.status === 'expired'  && <span className="badge bg-secondary rounded-pill">Expired</span>}
                          {sub.rejectionReason && sub.status === 'rejected' && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
                              {sub.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="text-muted small">{new Date(sub.createdAt).toLocaleDateString()}</td>
                        <td>
                          {sub.receiptUrl && !sub.receiptUrl.startsWith('chapa:') ? (
                            <a href={sub.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                              View
                            </a>
                          ) : sub.receiptUrl?.startsWith('chapa:') ? (
                            <span className="badge bg-info text-dark">Chapa</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {sub.status === 'pending' && (
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-success"
                                onClick={async () => {
                                  try {
                                    await client.patch(`/premium-subscriptions/${sub._id}/activate`);
                                    loadTabData(null, subsStatusFilter);
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
                                    loadTabData(null, subsStatusFilter);
                                  } catch (e) {
                                    setError(e.response?.data?.message || 'Failed');
                                  }
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {sub.status !== 'pending' && (
                            <span className="text-muted small fst-italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardCard>
        );

      case 'analytics':
        return <AnalyticsTab />;

      case 'chats':
        return <ChatHistoryTab />;

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
          <button className="btn btn-outline-success btn-sm" onClick={() => setTab('analytics')}>
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
                  {detailItem.contentType === 'user'    && `👤 ${detailItem.role === 'broker' ? 'Broker' : 'Individual'} Registration — ${detailItem.fullName}`}
                  {detailItem.contentType === 'company' && `🏢 Company Registration — ${detailItem.companyName}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowDetailModal(false); setDetailItem(null); }} />
              </div>
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
                {/* ── COMPANY DETAILS ── */}
                {detailItem.contentType === 'company' && (
                  <div>
                    <div className="d-flex align-items-center gap-4 mb-4 p-3 rounded-3 bg-light">
                      {detailItem.logo
                        ? <img src={detailItem.logo} alt="Logo" className="rounded-3" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                        : <div className="rounded-3 bg-success d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 80, height: 80, fontSize: '2rem' }}>🏢</div>
                      }
                      <div>
                        <h5 className="mb-1 fw-bold">{detailItem.companyName}</h5>
                        <div className="d-flex gap-2 flex-wrap">
                          <span className="badge bg-secondary text-capitalize">{detailItem.industry}</span>
                          <span className={`badge bg-${detailItem.verificationStatus === 'verified' ? 'success' : detailItem.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>{detailItem.verificationStatus}</span>
                          <span className={`badge bg-${detailItem.isActive ? 'success' : 'danger'}`}>{detailItem.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-header fw-semibold py-2">🏢 Company Identity</div>
                          <div className="card-body">
                            <table className="table table-sm mb-0">
                              <tbody>
                                <tr><td className="text-muted" style={{ width: 160 }}>Company Name</td><td className="fw-semibold">{detailItem.companyName}</td></tr>
                                <tr><td className="text-muted">Industry</td><td className="text-capitalize">{detailItem.industry}</td></tr>
                                <tr><td className="text-muted">Reg. Number</td><td><code>{detailItem.businessRegistrationNumber}</code></td></tr>
                                <tr><td className="text-muted">Founded</td><td>{detailItem.foundedDate ? new Date(detailItem.foundedDate).toLocaleDateString() : '—'}</td></tr>
                                <tr><td className="text-muted">Registered</td><td>{new Date(detailItem.createdAt).toLocaleString()}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-header fw-semibold py-2">📞 Contact Info</div>
                          <div className="card-body">
                            <table className="table table-sm mb-0">
                              <tbody>
                                <tr><td className="text-muted" style={{ width: 130 }}>Email</td><td>{detailItem.contactEmail || '—'}</td></tr>
                                <tr><td className="text-muted">Phone</td><td>{detailItem.contactPhone || '—'}</td></tr>
                                <tr><td className="text-muted">Website</td><td>{detailItem.website ? <a href={detailItem.website} target="_blank" rel="noreferrer">{detailItem.website}</a> : '—'}</td></tr>
                                <tr><td className="text-muted">Address</td><td>{detailItem.address || '—'}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {detailItem.description && (
                        <div className="col-12">
                          <div className="card"><div className="card-header fw-semibold py-2">📝 Description</div><div className="card-body"><p className="mb-0">{detailItem.description}</p></div></div>
                        </div>
                      )}
                      {/* Admin user who registered the company */}
                      {detailItem.adminUser && (
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header fw-semibold py-2">👤 Registered By</div>
                            <div className="card-body">
                              <table className="table table-sm mb-0">
                                <tbody>
                                  <tr><td className="text-muted" style={{ width: 120 }}>Name</td><td className="fw-semibold">{detailItem.adminUser.fullName || '—'}</td></tr>
                                  <tr><td className="text-muted">Phone</td><td>{detailItem.adminUser.phone || '—'}</td></tr>
                                  {detailItem.adminUser.email && <tr><td className="text-muted">Email</td><td>{detailItem.adminUser.email}</td></tr>}
                                  {detailItem.adminUser.location && <tr><td className="text-muted">Location</td><td>{detailItem.adminUser.location}</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-header fw-semibold py-2">✅ Verification Status</div>
                          <div className="card-body">
                            <table className="table table-sm mb-0">
                              <tbody>
                                <tr><td className="text-muted" style={{ width: 140 }}>Status</td><td><span className={`badge bg-${detailItem.verificationStatus === 'verified' ? 'success' : detailItem.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>{detailItem.verificationStatus}</span></td></tr>
                                {detailItem.verifiedAt && <tr><td className="text-muted">Verified At</td><td>{new Date(detailItem.verifiedAt).toLocaleString()}</td></tr>}
                                {detailItem.rejectionReason && <tr><td className="text-muted">Rejection Reason</td><td className="text-danger">{detailItem.rejectionReason}</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {(detailItem.socialLinks?.facebook || detailItem.socialLinks?.twitter || detailItem.socialLinks?.instagram || detailItem.socialLinks?.linkedin) && (
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header fw-semibold py-2">🔗 Social Links</div>
                            <div className="card-body d-flex flex-column gap-2">
                              {detailItem.socialLinks?.facebook  && <a href={detailItem.socialLinks.facebook}  target="_blank" rel="noreferrer">Facebook</a>}
                              {detailItem.socialLinks?.twitter   && <a href={detailItem.socialLinks.twitter}   target="_blank" rel="noreferrer">Twitter / X</a>}
                              {detailItem.socialLinks?.instagram && <a href={detailItem.socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}
                              {detailItem.socialLinks?.linkedin  && <a href={detailItem.socialLinks.linkedin}  target="_blank" rel="noreferrer">LinkedIn</a>}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="col-12">
                        <div className="card">
                          <div className="card-header fw-semibold py-2">📄 Documents & Media</div>
                          <div className="card-body d-flex flex-wrap gap-3">
                            {detailItem.businessRegistrationDoc && <a href={detailItem.businessRegistrationDoc} target="_blank" rel="noreferrer" className="btn btn-outline-primary">📄 Registration Document</a>}
                            {detailItem.logo        && <a href={detailItem.logo}        target="_blank" rel="noreferrer" className="btn btn-outline-secondary">🖼 Logo</a>}
                            {detailItem.coverPhoto  && <a href={detailItem.coverPhoto}  target="_blank" rel="noreferrer" className="btn btn-outline-secondary">🖼 Cover Photo</a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── USER / BROKER DETAILS ── */}
                {detailItem.contentType === 'user' && (
                  <div>
                    <div className="d-flex align-items-center gap-4 mb-4 p-3 rounded-3 bg-light">
                      {detailItem.profilePhoto
                        ? <img src={detailItem.profilePhoto} alt="Profile" className="rounded-circle" style={{ width: 72, height: 72, objectFit: 'cover' }} />
                        : <div className="rounded-circle bg-success d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>{detailItem.fullName?.[0]?.toUpperCase()}</div>
                      }
                      <div>
                        <h5 className="mb-1 fw-bold">{detailItem.fullName}</h5>
                        <div className="d-flex gap-2 flex-wrap">
                          <span className="badge bg-primary text-capitalize">{detailItem.role}</span>
                          <span className={`badge bg-${detailItem.verificationStatus === 'verified' ? 'success' : detailItem.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>{detailItem.verificationStatus}</span>
                          <span className={`badge bg-${detailItem.isPhoneVerified ? 'success' : 'secondary'}`}>{detailItem.isPhoneVerified ? '📱 Phone Verified' : '📱 Phone Not Verified'}</span>
                          <span className={`badge bg-${detailItem.isActive ? 'success' : 'danger'}`}>{detailItem.isActive ? 'Active' : 'Suspended'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-header fw-semibold py-2">👤 Personal Info</div>
                          <div className="card-body">
                            <table className="table table-sm mb-0">
                              <tbody>
                                <tr><td className="text-muted" style={{ width: 140 }}>Full Name</td><td className="fw-semibold">{detailItem.fullName}</td></tr>
                                <tr><td className="text-muted">Phone</td><td>{detailItem.phone}</td></tr>
                                <tr><td className="text-muted">Date of Birth</td><td>{detailItem.dateOfBirth ? new Date(detailItem.dateOfBirth).toLocaleDateString() : '—'}</td></tr>
                                <tr><td className="text-muted">Language</td><td className="text-capitalize">{detailItem.preferredLanguage || 'en'}</td></tr>
                                <tr><td className="text-muted">Registered</td><td>{new Date(detailItem.createdAt).toLocaleString()}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card h-100">
                          <div className="card-header fw-semibold py-2">🔐 Account Status</div>
                          <div className="card-body">
                            <table className="table table-sm mb-0">
                              <tbody>
                                <tr><td className="text-muted" style={{ width: 160 }}>Role</td><td className="text-capitalize fw-semibold">{detailItem.role}</td></tr>
                                <tr><td className="text-muted">Verification</td><td><span className={`badge bg-${detailItem.verificationStatus === 'verified' ? 'success' : detailItem.verificationStatus === 'rejected' ? 'danger' : 'warning'}`}>{detailItem.verificationStatus}</span></td></tr>
                                <tr><td className="text-muted">Phone Verified</td><td>{detailItem.isPhoneVerified ? '✅ Yes' : '❌ No'}</td></tr>
                                <tr><td className="text-muted">Account Active</td><td>{detailItem.isActive ? '✅ Yes' : '❌ Suspended'}</td></tr>
                                <tr><td className="text-muted">Free Trial Used</td><td>{detailItem.hasUsedFreeTrial ? '✅ Yes' : '❌ No'}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {detailItem.bio && (
                        <div className="col-12">
                          <div className="card"><div className="card-header fw-semibold py-2">📝 Bio</div><div className="card-body"><p className="mb-0">{detailItem.bio}</p></div></div>
                        </div>
                      )}
                      {(detailItem.location || detailItem.city || detailItem.region) && (
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header fw-semibold py-2">📍 Location</div>
                            <div className="card-body">
                              <table className="table table-sm mb-0">
                                <tbody>
                                  {detailItem.location && <tr><td className="text-muted" style={{ width: 100 }}>Address</td><td>{detailItem.location}</td></tr>}
                                  {detailItem.city     && <tr><td className="text-muted">City</td><td>{detailItem.city}</td></tr>}
                                  {detailItem.region   && <tr><td className="text-muted">Region</td><td>{detailItem.region}</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                      {detailItem.role === 'broker' && (detailItem.email || detailItem.website) && (
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header fw-semibold py-2">📞 Contact</div>
                            <div className="card-body">
                              <table className="table table-sm mb-0">
                                <tbody>
                                  {detailItem.email   && <tr><td className="text-muted" style={{ width: 80 }}>Email</td><td>{detailItem.email}</td></tr>}
                                  {detailItem.website && <tr><td className="text-muted">Website</td><td><a href={detailItem.website} target="_blank" rel="noreferrer">{detailItem.website}</a></td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                      {detailItem.role === 'broker' && detailItem.specializations?.length > 0 && (
                        <div className="col-12">
                          <div className="card">
                            <div className="card-header fw-semibold py-2">🎯 Specializations</div>
                            <div className="card-body d-flex flex-wrap gap-2">
                              {detailItem.specializations.map(s => <span key={s} className="badge bg-light text-dark border">{s}</span>)}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="col-12">
                        <div className="card">
                          <div className="card-header fw-semibold py-2">📄 Submitted Documents</div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-md-6">
                                <div className="fw-semibold small mb-2">🪪 National ID</div>
                                {detailItem.verificationDoc ? (
                                  <div>
                                    <a href={detailItem.verificationDoc} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm mb-2">🔗 Open National ID</a>
                                    <img src={detailItem.verificationDoc} alt="National ID" className="img-fluid rounded-3 border mt-1 d-block" style={{ maxHeight: 200, objectFit: 'contain', width: '100%' }} onError={e => { e.target.style.display='none'; }} />
                                  </div>
                                ) : <span className="text-muted small">Not uploaded</span>}
                              </div>
                              {detailItem.role === 'broker' && (
                                <div className="col-md-6">
                                  <div className="fw-semibold small mb-2">🏷️ Broker License</div>
                                  {detailItem.businessLicense && (
                                    <div className="mb-1 small"><span className="text-muted">License No: </span><code>{detailItem.businessLicense}</code>{detailItem.licenseType && <span className="ms-2 badge bg-light text-dark border">{detailItem.licenseType}</span>}</div>
                                  )}
                                  {detailItem.businessLicenseDoc
                                    ? <a href={detailItem.businessLicenseDoc} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">🔗 Open License Document</a>
                                    : <span className="text-muted small">Not uploaded</span>
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* ── LISTING DETAILS ── */}
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
                      <div style={{ whiteSpace: 'pre-wrap', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '16px', lineHeight: '1.6' }}>
                        {detailItem.description}
                      </div>
                    </div>
                    <div className="mb-3">
                      <h6>Location</h6>
                      <p>
                        {detailItem.location?.city && `${detailItem.location.city}, `}
                        {detailItem.location?.region && detailItem.location.region}
                        {detailItem.location?.address && (<><br /><small className="text-muted">{detailItem.location.address}</small></>)}
                      </p>
                    </div>
                    {detailItem.images && detailItem.images.length > 0 && (
                      <div className="mb-3">
                        <h6>Images ({detailItem.images.length})</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {detailItem.images.map((img, idx) => (
                            <img key={idx} src={img} alt={`Image ${idx + 1}`} style={{ height: 120, width: 160, objectFit: 'cover', borderRadius: '8px' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    {detailItem.video && (
                      <div className="mb-3">
                        <h6>Video</h6>
                        <video controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', backgroundColor: '#000' }}>
                          <source src={detailItem.video} type="video/mp4" />
                        </video>
                      </div>
                    )}
                    <div className="row mb-3">
                      <div className="col-md-4"><h6>Status</h6><p><span className="badge bg-info">{detailItem.status}</span></p></div>
                      <div className="col-md-4"><h6>Views</h6><p>{detailItem.viewCount || 0}</p></div>
                      <div className="col-md-4"><h6>Created At</h6><p>{new Date(detailItem.createdAt).toLocaleString()}</p></div>
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDetailModal(false); setDetailItem(null); }}>
                  Close
                </button>
                {detailItem.contentType === 'listing' && (
                  <>
                    <button type="button" className="btn btn-outline-danger" onClick={() => handleDeleteListing(detailItem._id)}>🗑 Delete</button>
                    <button type="button" className="btn btn-danger" onClick={() => { setShowDetailModal(false); handleRejectListing(detailItem._id); }}>✗ Reject</button>
                    <button type="button" className="btn btn-success" onClick={() => handleApproveListing(detailItem._id)}>✓ Approve</button>
                  </>
                )}
                {detailItem.contentType === 'company' && detailItem.verificationStatus === 'pending' && (
                  <>
                    <button type="button" className="btn btn-danger" onClick={() => { setShowDetailModal(false); setDetailItem(null); setRejectTarget({ type: 'company', id: detailItem._id }); setShowRejectModal(true); }}>✗ Reject</button>
                    <button type="button" className="btn btn-success" onClick={async () => { try { await client.patch(`/admin/companies/${detailItem._id}/approve`); setShowDetailModal(false); setDetailItem(null); loadTabData(); } catch (err) { setError(err.response?.data?.message || 'Failed.'); } }}>✓ Approve</button>
                  </>
                )}
                {detailItem.contentType === 'user' && detailItem.verificationStatus === 'pending' && (
                  <>
                    <button type="button" className="btn btn-danger" onClick={async () => { await handleVerify(detailItem._id, 'reject');  setShowDetailModal(false); setDetailItem(null); }}>✗ Reject</button>
                    <button type="button" className="btn btn-success" onClick={async () => { await handleVerify(detailItem._id, 'approve'); setShowDetailModal(false); setDetailItem(null); }}>✓ Approve</button>
                  </>
                )}
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