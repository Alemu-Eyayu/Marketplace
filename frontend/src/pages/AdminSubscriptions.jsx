import { useState, useEffect } from 'react';
import client from '../api/client';

const STATUS_BADGE = {
  pending:  'bg-warning text-dark',
  active:   'bg-success',
  inactive: 'bg-danger',
  expired:  'bg-secondary',
};

const CATEGORY_LABELS = {
  'real-estate': 'Real Estate', 'automotive': 'Automotive', 'electronics': 'Electronics',
  'home-furniture': 'Home & Furniture', 'fashion-clothing': 'Fashion', 'sports-fitness': 'Sports',
  'books-media': 'Books & Media', 'pets-animals': 'Pets', 'services': 'Services',
  'domestic-jobs': 'Domestic Jobs', 'professional-jobs': 'Professional Jobs',
  'business-industrial': 'Business', 'agriculture': 'Agriculture',
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubs]  = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [statusFilter, setFilter] = useState('pending');
  const [page, setPage]           = useState(1);
  const [selected, setSelected]   = useState(null); // detail modal
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    fetchSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  async function fetchSubs() {
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/premium-subscriptions', {
        params: { status: statusFilter, page, limit: 20 },
      });
      setSubs(data.subscriptions || []);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(id) {
    setActionLoading(id + 'activate');
    setError(''); setSuccess('');
    try {
      await client.patch(`/premium-subscriptions/${id}/activate`);
      setSuccess('Subscription activated successfully.');
      setSelected(null);
      fetchSubs();
    } catch (err) {
      setError(err.response?.data?.message || 'Activation failed.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleDeactivate(id) {
    setActionLoading(id + 'deactivate');
    setError(''); setSuccess('');
    try {
      await client.patch(`/premium-subscriptions/${id}/deactivate`);
      setSuccess('Subscription deactivated.');
      setSelected(null);
      fetchSubs();
    } catch (err) {
      setError(err.response?.data?.message || 'Deactivation failed.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) return setError('Please enter a rejection reason.');
    setActionLoading(id + 'reject');
    setError(''); setSuccess('');
    try {
      await client.patch(`/premium-subscriptions/${id}/reject`, { reason: rejectReason });
      setSuccess('Subscription request rejected.');
      setSelected(null);
      setRejectReason('');
      fetchSubs();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Premium Subscription Management</h4>
        <button className="btn btn-sm btn-outline-secondary" onClick={fetchSubs}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {error   && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filter tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {['pending', 'active', 'inactive', 'all'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-success' : 'btn-outline-secondary'} text-capitalize`}
            onClick={() => { setFilter(s); setPage(1); }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '3rem' }}>📋</div>
          <p className="mt-2">No {statusFilter} subscription requests.</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Subscriber</th>
                  <th>Role</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Payment</th>
                  <th>Fee (ETB)</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {sub.user?.profilePhoto ? (
                          <img src={sub.user.profilePhoto} alt="" className="rounded-circle" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                        ) : (
                          <div className="rounded-circle bg-success d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                            {(sub.user?.fullName || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="fw-semibold small">{sub.user?.fullName || 'Unknown'}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{sub.user?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge bg-secondary text-capitalize">{sub.user?.role}</span></td>
                    <td><span className="small">{CATEGORY_LABELS[sub.categorySlug] || sub.categorySlug}</span></td>
                    <td className="text-capitalize small">{sub.duration}</td>
                    <td className="text-uppercase small">{sub.paymentMethod}</td>
                    <td className="fw-semibold">{sub.fee?.toLocaleString()}</td>
                    <td><span className={`badge ${STATUS_BADGE[sub.status]}`}>{sub.status}</span></td>
                    <td className="small text-muted">{new Date(sub.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => { setSelected(sub); setRejectReason(''); }}
                        >
                          View
                        </button>
                        {sub.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              disabled={actionLoading === sub._id + 'activate'}
                              onClick={() => handleActivate(sub._id)}
                            >
                              {actionLoading === sub._id + 'activate' ? '…' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setSelected({ ...sub, showReject: true })}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {sub.status === 'active' && (
                          <button
                            className="btn btn-sm btn-warning"
                            disabled={actionLoading === sub._id + 'deactivate'}
                            onClick={() => handleDeactivate(sub._id)}
                          >
                            {actionLoading === sub._id + 'deactivate' ? '…' : 'Deactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="btn btn-sm disabled">Page {page} of {pagination.pages}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content rounded-3">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Subscription Request Detail</h5>
                <button className="btn-close" onClick={() => setSelected(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <table className="table table-sm">
                      <tbody>
                        <tr><th>Subscriber</th><td>{selected.user?.fullName}</td></tr>
                        <tr><th>Phone</th><td>{selected.user?.phone}</td></tr>
                        <tr><th>Role</th><td className="text-capitalize">{selected.user?.role}</td></tr>
                        <tr><th>Category</th><td>{CATEGORY_LABELS[selected.categorySlug] || selected.categorySlug}</td></tr>
                        <tr><th>Duration</th><td className="text-capitalize">{selected.duration}</td></tr>
                        <tr><th>Payment Method</th><td className="text-uppercase">{selected.paymentMethod}</td></tr>
                        <tr><th>Fee</th><td className="fw-bold text-success">{selected.fee?.toLocaleString()} ETB</td></tr>
                        <tr><th>Status</th><td><span className={`badge ${STATUS_BADGE[selected.status]}`}>{selected.status}</span></td></tr>
                        <tr><th>Submitted</th><td>{new Date(selected.createdAt).toLocaleString()}</td></tr>
                        {selected.startDate && <tr><th>Start Date</th><td>{new Date(selected.startDate).toLocaleDateString()}</td></tr>}
                        {selected.expiryDate && <tr><th>Expiry Date</th><td>{new Date(selected.expiryDate).toLocaleDateString()}</td></tr>}
                        {selected.rejectionReason && <tr><th>Rejection Reason</th><td className="text-danger">{selected.rejectionReason}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <p className="fw-semibold mb-2">Payment Receipt:</p>
                    {selected.receiptUrl ? (
                      selected.receiptUrl.endsWith('.pdf') || selected.receiptUrl.includes('/raw/') ? (
                        <a href={selected.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-outline-primary">
                          📄 View PDF Receipt
                        </a>
                      ) : (
                        <a href={selected.receiptUrl} target="_blank" rel="noreferrer">
                          <img src={selected.receiptUrl} alt="Receipt" className="img-fluid rounded border" style={{ maxHeight: 300 }} />
                        </a>
                      )
                    ) : (
                      <p className="text-muted">No receipt uploaded.</p>
                    )}
                  </div>
                </div>

                {/* Reject form */}
                {(selected.showReject || selected.status === 'pending') && (
                  <div className="mt-3 border-top pt-3">
                    <label className="form-label fw-semibold">Rejection Reason (required to reject):</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Receipt is unclear, wrong amount, etc."
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                {selected.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-success"
                      disabled={actionLoading === selected._id + 'activate'}
                      onClick={() => handleActivate(selected._id)}
                    >
                      {actionLoading === selected._id + 'activate' ? '…' : '✓ Activate Subscription'}
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={actionLoading === selected._id + 'reject'}
                      onClick={() => handleReject(selected._id)}
                    >
                      {actionLoading === selected._id + 'reject' ? '…' : '✗ Reject Request'}
                    </button>
                  </>
                )}
                {selected.status === 'active' && (
                  <button
                    className="btn btn-warning"
                    disabled={actionLoading === selected._id + 'deactivate'}
                    onClick={() => handleDeactivate(selected._id)}
                  >
                    {actionLoading === selected._id + 'deactivate' ? '…' : 'Deactivate'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
