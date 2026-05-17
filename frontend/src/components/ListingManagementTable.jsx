import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import PlanSelectionModal from './PlanSelectionModal';

const STATUS_META = {
  active:   { label: 'Active',   bg: '#dcfce7', color: '#16a34a', icon: 'bi-check-circle-fill' },
  inactive: { label: 'Inactive', bg: '#f3f4f6', color: '#6b7280', icon: 'bi-pause-circle-fill' },
  expired:  { label: 'Expired',  bg: '#fef9c3', color: '#ca8a04', icon: 'bi-clock-fill' },
  removed:  { label: 'Removed',  bg: '#fee2e2', color: '#dc2626', icon: 'bi-x-circle-fill' },
};

const CATEGORY_ICONS = {
  'real-estate': '🏠', automotive: '🚗', electronics: '📱',
  'home-furniture': '🛋️', 'fashion-clothing': '👕', 'sports-fitness': '⚽',
  'books-media': '📚', 'pets-animals': '🐾', services: '🔧',
  jobs: '💼', 'business-industrial': '🏭', agriculture: '🌾',
};

/**
 * Shared listing management table for Broker and Company dashboards.
 *
 * Props:
 *   listings     – array of listing objects
 *   onRefresh    – callback to reload listings from parent
 *   showFeatured – show featured toggle column (broker only)
 *   hasPremium   – whether user has active subscription (broker only)
 *   userRole     – user's role for plan modal (user/broker/company)
 */
export default function ListingManagementTable({
  listings = [],
  onRefresh,
  showFeatured = false,
  hasPremium = false,
  userRole,
}) {
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // id | 'bulk' | null
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [planModal, setPlanModal] = useState(false);

  function showSuccess(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  function toggleAll(checked) {
    setSelected(checked ? new Set(listings.map((l) => l._id)) : new Set());
  }
  function toggleOne(id, checked) {
    const next = new Set(selected);
    checked ? next.add(id) : next.delete(id);
    setSelected(next);
  }

  // ── Per-row actions ────────────────────────────────────────────────────────
  async function handleStatus(id, action) {
    setActionLoading(id + action);
    setError('');
    try {
      await client.patch(`/listings/${id}/status`, { action });
      showSuccess(
        action === 'activate' ? 'Listing activated.' :
        action === 'deactivate' ? 'Listing paused.' :
        'Listing renewed for 30 days.'
      );
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id) {
    setActionLoading(id + 'delete');
    setError('');
    try {
      await client.delete(`/listings/${id}`);
      setConfirmDelete(null);
      showSuccess('Listing deleted.');
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFeature(id) {
    setActionLoading(id + 'feature');
    setError('');
    try {
      await client.patch(`/listings/${id}/feature`);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Feature toggle failed.');
    } finally {
      setActionLoading(null);
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function applyBulk() {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === 'delete') {
      setConfirmDelete('bulk');
      return;
    }
    const ids = Array.from(selected);
    setError('');
    try {
      await Promise.all(
        ids.map((id) => client.patch(`/listings/${id}/status`, { action: bulkAction }))
      );
      setSelected(new Set());
      setBulkAction('');
      showSuccess(`${ids.length} listing${ids.length > 1 ? 's' : ''} updated.`);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk action failed.');
    }
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selected);
    setError('');
    try {
      await Promise.all(ids.map((id) => client.delete(`/listings/${id}`)));
      setSelected(new Set());
      setBulkAction('');
      setConfirmDelete(null);
      showSuccess(`${ids.length} listing${ids.length > 1 ? 's' : ''} deleted.`);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.');
      setConfirmDelete(null);
    }
  }

  const isActing = (id, suffix) => actionLoading === id + suffix;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (listings.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: '#6b7280' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📋</div>
        <p className="fw-semibold mb-1">No listings yet</p>
        <p className="small mb-3">Create your first listing to start selling.</p>
        <button className="btn btn-primary rounded-pill px-4" onClick={() => setPlanModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>Create Listing
        </button>
        {planModal && (
          <PlanSelectionModal
            userRole={userRole}
            onClose={() => setPlanModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible py-2 mb-3" style={{ fontSize: '0.85rem' }}>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
          <button className="btn-close" onClick={() => setError('')} />
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2 mb-3" style={{ fontSize: '0.85rem' }}>
          <i className="bi bi-check-circle-fill me-2"></i>{success}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗑️</div>
            <h5 style={{ fontWeight: 700, marginBottom: 8 }}>
              Delete {confirmDelete === 'bulk' ? `${selected.size} Listing${selected.size > 1 ? 's' : ''}` : 'Listing'}?
            </h5>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 24 }}>
              {confirmDelete === 'bulk'
                ? `This will permanently delete ${selected.size} listing${selected.size > 1 ? 's' : ''} and all their images. This cannot be undone.`
                : 'This will permanently delete this listing and all its images. This cannot be undone.'}
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <button
                className="btn btn-outline-secondary px-4"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger px-4"
                onClick={() =>
                  confirmDelete === 'bulk' ? confirmBulkDelete() : handleDelete(confirmDelete)
                }
                disabled={!!actionLoading}
              >
                {actionLoading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Deleting…</>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          {selected.size > 0 ? (
            <>
              <span className="badge bg-primary rounded-pill">{selected.size} selected</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option value="">Bulk action…</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              <button
                className="btn btn-sm btn-primary"
                onClick={applyBulk}
                disabled={!bulkAction}
              >
                Apply
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => { setSelected(new Set()); setBulkAction(''); }}
              >
                Clear
              </button>
            </>
          ) : (
            <span className="text-muted small">{listings.length} listing{listings.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button className="btn btn-primary btn-sm rounded-pill px-3" onClick={() => setPlanModal(true)}>
          <i className="bi bi-plus-lg me-1"></i>New Listing
        </button>
      </div>

      {/* Plan Selection Modal */}
      {planModal && (
        <PlanSelectionModal
          userRole={userRole}
          onClose={() => setPlanModal(false)}
        />
      )}

      <div className="d-none d-md-block" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <th style={{ padding: '10px 12px', width: 36 }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={listings.length > 0 && selected.size === listings.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'left' }}>Listing</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>Views</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>Status</th>
              {showFeatured && (
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>Featured</th>
              )}
              <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => {
              const sm = STATUS_META[l.status] || STATUS_META.inactive;
              return (
                <tr
                  key={l._id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selected.has(l._id) ? '#eff6ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ padding: '12px 12px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selected.has(l._id)}
                      onChange={(e) => toggleOne(l._id, e.target.checked)}
                    />
                  </td>

                  {/* Title + price */}
                  <td style={{ padding: '12px 12px' }}>
                    <div className="d-flex align-items-center gap-2">
                      {l.images?.[0] ? (
                        <img
                          src={l.images[0]}
                          alt=""
                          style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 52, height: 40, borderRadius: 6, flexShrink: 0,
                          background: '#f0fdf4', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '1.2rem',
                        }}>
                          {CATEGORY_ICONS[l.categorySlug] || '🏷️'}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <Link
                          to={`/listings/${l._id}`}
                          className="d-block text-truncate"
                          style={{ maxWidth: 200, fontWeight: 600, color: '#111827', textDecoration: 'none' }}
                        >
                          {l.title}
                        </Link>
                        <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                          {l.price?.toLocaleString()} {l.currency || 'ETB'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      background: '#f3f4f6', color: '#374151',
                      borderRadius: 20, padding: '3px 10px',
                      whiteSpace: 'nowrap',
                    }}>
                      {CATEGORY_ICONS[l.categorySlug]} {l.categorySlug?.replace(/-/g, ' ')}
                    </span>
                  </td>

                  {/* Views */}
                  <td style={{ padding: '12px 12px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                    <i className="bi bi-eye me-1"></i>{l.viewCount || 0}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                    <span style={{
                      background: sm.bg, color: sm.color,
                      borderRadius: 20, padding: '4px 12px',
                      fontSize: '0.72rem', fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className={`bi ${sm.icon}`} style={{ fontSize: '0.65rem' }}></i>
                      {sm.label}
                    </span>
                  </td>

                  {/* Featured toggle */}
                  {showFeatured && (
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleFeature(l._id)}
                        disabled={!hasPremium || isActing(l._id, 'feature')}
                        title={!hasPremium ? 'Premium subscription required' : l.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                        style={{
                          background: l.isFeatured ? '#fef3c7' : '#f9fafb',
                          color: l.isFeatured ? '#d97706' : '#9ca3af',
                          border: `1px solid ${l.isFeatured ? '#fcd34d' : '#e5e7eb'}`,
                          borderRadius: 8, padding: '4px 10px',
                          fontSize: '0.78rem', fontWeight: 700,
                          cursor: hasPremium ? 'pointer' : 'not-allowed',
                          opacity: hasPremium ? 1 : 0.5,
                        }}
                      >
                        {isActing(l._id, 'feature') ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : l.isFeatured ? (
                          '⭐ Featured'
                        ) : (
                          '☆ Feature'
                        )}
                      </button>
                    </td>
                  )}

                  {/* Actions */}
                  <td style={{ padding: '12px 12px' }}>
                    <div className="d-flex gap-1 justify-content-end flex-wrap">
                      {/* Edit */}
                      <Link
                        to={`/listings/${l._id}/edit`}
                        className="btn btn-sm btn-outline-secondary"
                        title="Edit listing"
                      >
                        <i className="bi bi-pencil me-1"></i>Edit
                      </Link>

                      {/* Status action — context-aware */}
                      {l.status === 'active' && (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleStatus(l._id, 'deactivate')}
                          disabled={isActing(l._id, 'deactivate')}
                          title="Pause listing"
                        >
                          {isActing(l._id, 'deactivate') ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <><i className="bi bi-pause-circle me-1"></i>Pause</>
                          )}
                        </button>
                      )}
                      {l.status === 'inactive' && (
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleStatus(l._id, 'activate')}
                          disabled={isActing(l._id, 'activate')}
                          title="Activate listing"
                        >
                          {isActing(l._id, 'activate') ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <><i className="bi bi-play-circle me-1"></i>Activate</>
                          )}
                        </button>
                      )}
                      {l.status === 'expired' && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleStatus(l._id, 'renew')}
                          disabled={isActing(l._id, 'renew')}
                          title="Renew for 30 days"
                        >
                          {isActing(l._id, 'renew') ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <><i className="bi bi-arrow-clockwise me-1"></i>Renew</>
                          )}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setConfirmDelete(l._id)}
                        title="Delete listing"
                      >
                        <i className="bi bi-trash3 me-1"></i>Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ──────────────────────────────────────────────────── */}
      <div className="d-md-none d-flex flex-column gap-3">
        {listings.map((l) => {
          const sm = STATUS_META[l.status] || STATUS_META.inactive;
          return (
            <div
              key={l._id}
              style={{
                background: '#fff',
                border: `1px solid ${selected.has(l._id) ? '#93c5fd' : '#e5e7eb'}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {/* Card header */}
              <div className="d-flex gap-3 p-3">
                <input
                  type="checkbox"
                  className="form-check-input mt-1 flex-shrink-0"
                  checked={selected.has(l._id)}
                  onChange={(e) => toggleOne(l._id, e.target.checked)}
                />
                {l.images?.[0] ? (
                  <img
                    src={l.images[0]}
                    alt=""
                    style={{ width: 64, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 64, height: 52, borderRadius: 8, background: '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', flexShrink: 0,
                  }}>
                    {CATEGORY_ICONS[l.categorySlug] || '🏷️'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/listings/${l._id}`}
                    className="d-block text-truncate fw-semibold text-dark text-decoration-none mb-1"
                  >
                    {l.title}
                  </Link>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 700 }}>
                      {l.price?.toLocaleString()} {l.currency || 'ETB'}
                    </span>
                    <span style={{
                      background: sm.bg, color: sm.color,
                      borderRadius: 20, padding: '2px 8px',
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>
                      {sm.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                      <i className="bi bi-eye me-1"></i>{l.viewCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card actions */}
              <div style={{
                borderTop: '1px solid #f3f4f6',
                padding: '10px 14px',
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                <Link to={`/listings/${l._id}/edit`} className="btn btn-sm btn-outline-secondary">
                  <i className="bi bi-pencil me-1"></i>Edit
                </Link>

                {l.status === 'active' && (
                  <button
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => handleStatus(l._id, 'deactivate')}
                    disabled={isActing(l._id, 'deactivate')}
                  >
                    {isActing(l._id, 'deactivate') ? '…' : 'Pause'}
                  </button>
                )}
                {l.status === 'inactive' && (
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => handleStatus(l._id, 'activate')}
                    disabled={isActing(l._id, 'activate')}
                  >
                    {isActing(l._id, 'activate') ? '…' : 'Activate'}
                  </button>
                )}
                {l.status === 'expired' && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleStatus(l._id, 'renew')}
                    disabled={isActing(l._id, 'renew')}
                  >
                    {isActing(l._id, 'renew') ? '…' : 'Renew'}
                  </button>
                )}

                {showFeatured && (
                  <button
                    className={`btn btn-sm ${l.isFeatured ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => handleFeature(l._id)}
                    disabled={!hasPremium || isActing(l._id, 'feature')}
                    title={!hasPremium ? 'Premium required' : ''}
                  >
                    {isActing(l._id, 'feature') ? '…' : l.isFeatured ? '⭐ Featured' : '☆ Feature'}
                  </button>
                )}

                <button
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={() => setConfirmDelete(l._id)}
                >
                  <i className="bi bi-trash3 me-1"></i>Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
