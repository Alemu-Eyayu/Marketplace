import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../api/client';

// Inject keyframe animation once
const CREATE_BTN_STYLE = `
@keyframes pulse-glow {
  0%   { box-shadow: 0 0 0 0 rgba(25,135,84,0.55); transform: scale(1); }
  50%  { box-shadow: 0 0 0 10px rgba(25,135,84,0); transform: scale(1.04); }
  100% { box-shadow: 0 0 0 0 rgba(25,135,84,0); transform: scale(1); }
}
@keyframes bounce-arrow {
  0%, 100% { transform: translateX(0); }
  50%       { transform: translateX(4px); }
}
.create-listing-btn {
  animation: pulse-glow 1.8s ease-in-out infinite;
  transition: background 0.2s, transform 0.15s;
}
.create-listing-btn:hover {
  animation: none;
  transform: scale(1.06);
  box-shadow: 0 4px 18px rgba(25,135,84,0.4);
}
.create-listing-btn .arrow-icon {
  display: inline-block;
  animation: bounce-arrow 1s ease-in-out infinite;
}
`;

const CATEGORY_LABELS = {
  'real-estate': '🏠 Real Estate',
  'automotive': '🚗 Automotive',
  'electronics': '📱 Electronics',
  'home-furniture': '🛋️ Home & Furniture',
  'fashion-clothing': '👕 Fashion & Clothing',
  'sports-fitness': '⚽ Sports & Fitness',
  'books-media': '📚 Books & Media',
  'pets-animals': '🐾 Pets & Animals',
  'services': '🔧 Services',
  'domestic-jobs': '🏡 Domestic Jobs',
  'professional-jobs': '💼 Professional Jobs',
  'business-industrial': '🏭 Business & Industrial',
  'agriculture': '🌾 Agriculture',
};

const MANUAL_PAYMENT_METHODS = [
  { value: 'cbe',      label: 'CBE (Commercial Bank of Ethiopia)', account: '1000123456789', name: 'EthioGebiya PLC' },
  { value: 'telebirr', label: 'Telebirr',                          account: '0911000000',    name: 'EthioGebiya' },
  { value: 'mpesa',    label: 'M-Pesa',                            account: '0911000001',    name: 'EthioGebiya' },
];

export default function PremiumSubscription() {
  const user = useSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCategory = searchParams.get('category') || '';
  const preselectedDuration = searchParams.get('duration') || '';

  // Check if returning from Chapa payment
  const txRef = searchParams.get('tx_ref');

  const [pricing, setPricing]           = useState(null);
  const [mySubscriptions, setMySubs]    = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [paymentMode, setPaymentMode]   = useState('chapa'); // 'chapa' or 'manual'

  // Form state
  const [selectedCategory, setCategory] = useState(preselectedCategory);
  const [duration, setDuration]         = useState(preselectedDuration || 'monthly');
  const [paymentMethod, setPayMethod]   = useState('cbe');
  const [receiptFile, setReceiptFile]   = useState(null);

  useEffect(() => {
    Promise.all([
      client.get('/premium-subscriptions/pricing'),
      client.get('/premium-subscriptions/my'),
    ]).then(([pricingRes, myRes]) => {
      setPricing(pricingRes.data);
      setMySubs(myRes.data.subscriptions || []);
    }).catch(() => {
      setError('Failed to load subscription data.');
    }).finally(() => setLoading(false));
  }, []);

  // Verify Chapa payment on return
  useEffect(() => {
    if (!txRef) return;
    client.get(`/premium-subscriptions/chapa/verify?tx_ref=${txRef}`)
      .then(({ data }) => {
        if (data.success && data.status === 'paid') {
          setSuccess('Payment successful! Your subscription request has been submitted. An admin will activate it shortly.');
          // Refresh subscriptions
          client.get('/premium-subscriptions/my').then(({ data: d }) => setMySubs(d.subscriptions || []));
        } else {
          setError('Payment could not be verified. Please contact support if you were charged.');
        }
      })
      .catch(() => setError('Payment verification failed. Please contact support.'));
  }, [txRef]);

  const role = user?.role;
  const tier = pricing?.roleTier?.[role];
  const allowedCategories = pricing?.roleAllowedCategories?.[role] || [];

  function computeFee() {
    if (!pricing || !selectedCategory || !tier) return null;
    const level = pricing.categoryPriceLevel?.[selectedCategory] || 'medium';
    return pricing.priceTable?.[tier]?.[level]?.[duration];
  }

  function getSubStatus(categorySlug) {
    return mySubscriptions.find(s => s.categorySlug === categorySlug && ['pending', 'active'].includes(s.status)) || null;
  }

  // Pay with Chapa
  async function handleChapaPayment(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!selectedCategory) return setError('Please select a category.');
    setSubmitting(true);
    try {
      const { data } = await client.post('/premium-subscriptions/chapa/initialize', {
        categorySlug: selectedCategory,
        duration,
      });
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Payment initialization failed.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Manual receipt upload
  async function handleManualSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!selectedCategory) return setError('Please select a category.');
    if (!receiptFile)       return setError('Please upload your payment receipt.');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('categorySlug',  selectedCategory);
      fd.append('duration',      duration);
      fd.append('paymentMethod', paymentMethod);
      fd.append('receipt',       receiptFile);
      await client.post('/premium-subscriptions', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Subscription request submitted! An admin will review your receipt and activate your subscription shortly.');
      setReceiptFile(null);
      setCategory('');
      const { data } = await client.get('/premium-subscriptions/my');
      setMySubs(data.subscriptions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const fee = computeFee();
  const selectedPayment = MANUAL_PAYMENT_METHODS.find(p => p.value === paymentMethod);
  const existingSub = selectedCategory ? getSubStatus(selectedCategory) : null;

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <style>{CREATE_BTN_STYLE}</style>
      <div className="mb-4">
        <h2 className="fw-bold">Premium Subscription</h2>
        <p className="text-muted">Subscribe per category to post listings. Each category requires a separate subscription.</p>
      </div>

      {error   && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-4">

        {/* ── Left: Subscription Form ── */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">New Subscription Request</h5>

              {/* Payment mode toggle */}
              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  className={`btn btn-sm flex-fill ${paymentMode === 'chapa' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setPaymentMode('chapa')}
                >
                  ⚡ Pay with Chapa (Recommended)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm flex-fill ${paymentMode === 'manual' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setPaymentMode('manual')}
                >
                  📤 Manual Transfer
                </button>
              </div>

              {/* Chapa payment form */}
              {paymentMode === 'chapa' && (
                <form onSubmit={handleChapaPayment}>

                  {/* Category */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">1. Category *</label>
                    {preselectedCategory ? (
                      /* Read-only — came from plan selection modal or create listing page */
                      <div className="d-flex align-items-center gap-2 border rounded-3 p-3 bg-success bg-opacity-10 border-success">
                        <span className="fw-semibold text-success">{CATEGORY_LABELS[selectedCategory] || selectedCategory}</span>
                        <i className="bi bi-check-circle-fill text-success ms-auto"></i>
                      </div>
                    ) : (
                      <select className="form-select" value={selectedCategory} onChange={e => setCategory(e.target.value)} required>
                        <option value="">-- Choose a category --</option>
                        {allowedCategories.map(slug => {
                          const sub = getSubStatus(slug);
                          return (
                            <option key={slug} value={slug} disabled={!!sub}>
                              {CATEGORY_LABELS[slug] || slug}{sub ? ` (${sub.status})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    {existingSub && <div className="mt-2 small text-warning">⚠️ You already have a <strong>{existingSub.status}</strong> subscription for this category.</div>}
                    {existingSub?.status === 'active' && preselectedCategory && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-success rounded-pill px-4 py-2 fw-semibold create-listing-btn"
                          onClick={() => navigate(`/listings/create?category=${selectedCategory}`)}
                        >
                          <i className="bi bi-plus-circle-fill me-2"></i>
                          Create Listing Now
                          <span className="arrow-icon ms-2">→</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">2. Duration *</label>
                    {preselectedDuration ? (
                      /* Read-only — duration was chosen in the plan selection modal */
                      <div className="d-flex align-items-center gap-2 border rounded-3 p-3 bg-success bg-opacity-10 border-success">
                        <span className="fw-semibold text-success text-capitalize">{duration}</span>
                        {duration === 'yearly' && <span className="small text-muted ms-1">— Save 2 months!</span>}
                        <i className="bi bi-check-circle-fill text-success ms-auto"></i>
                      </div>
                    ) : (
                      <div className="d-flex gap-3">
                        {['monthly', 'yearly'].map(d => {
                          const level = pricing?.categoryPriceLevel?.[selectedCategory] || 'medium';
                          const price = tier ? pricing?.priceTable?.[tier]?.[level]?.[d] : null;
                          return (
                            <div key={d} className={`flex-fill border rounded-3 p-3 ${duration === d ? 'border-success bg-success bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setDuration(d)}>
                              <div className="fw-semibold text-capitalize">{d}</div>
                              {price && <div className="text-success fw-bold">{price.toLocaleString()} ETB</div>}
                              {d === 'yearly' && <div className="small text-muted">Save 2 months!</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {fee && selectedCategory && !existingSub && (
                    <div className="bg-light rounded-3 p-3 mb-4">
                      <div className="d-flex justify-content-between"><span>Category:</span><strong>{CATEGORY_LABELS[selectedCategory]}</strong></div>
                      <div className="d-flex justify-content-between"><span>Duration:</span><strong className="text-capitalize">{duration}</strong></div>
                      <div className="d-flex justify-content-between"><span>Payment via:</span><strong>Chapa (Telebirr, CBE, M-Pesa, Card)</strong></div>
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between fw-bold fs-5"><span>Total:</span><span className="text-success">{fee.toLocaleString()} ETB</span></div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-success w-100 fw-semibold py-2" disabled={submitting || !!existingSub}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Redirecting to Chapa…</> : '⚡ Pay Now with Chapa'}
                  </button>
                  <p className="text-muted small text-center mt-2">You will be redirected to Chapa's secure checkout. Supports Telebirr, CBE Birr, M-Pesa, and bank cards.</p>
                </form>
              )}

              {/* Manual payment form */}
              {paymentMode === 'manual' && (
                <form onSubmit={handleManualSubmit}>

                  {/* Category */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">1. Category *</label>
                    {preselectedCategory ? (
                      /* Read-only — came from plan selection modal or create listing page */
                      <div className="d-flex align-items-center gap-2 border rounded-3 p-3 bg-success bg-opacity-10 border-success">
                        <span className="fw-semibold text-success">{CATEGORY_LABELS[selectedCategory] || selectedCategory}</span>
                        <i className="bi bi-check-circle-fill text-success ms-auto"></i>
                      </div>
                    ) : (
                      <select className="form-select" value={selectedCategory} onChange={e => setCategory(e.target.value)} required>
                        <option value="">-- Choose a category --</option>
                        {allowedCategories.map(slug => {
                          const sub = getSubStatus(slug);
                          return (
                            <option key={slug} value={slug} disabled={!!sub}>
                              {CATEGORY_LABELS[slug] || slug}{sub ? ` (${sub.status})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    {existingSub && <div className="mt-2 small text-warning">⚠️ You already have a <strong>{existingSub.status}</strong> subscription for this category.</div>}
                    {existingSub?.status === 'active' && preselectedCategory && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-success rounded-pill px-4 py-2 fw-semibold create-listing-btn"
                          onClick={() => navigate(`/listings/create?category=${selectedCategory}`)}
                        >
                          <i className="bi bi-plus-circle-fill me-2"></i>
                          Create Listing Now
                          <span className="arrow-icon ms-2">→</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">2. Duration *</label>
                    {preselectedDuration ? (
                      /* Read-only — duration was chosen in the plan selection modal */
                      <div className="d-flex align-items-center gap-2 border rounded-3 p-3 bg-success bg-opacity-10 border-success">
                        <span className="fw-semibold text-success text-capitalize">{duration}</span>
                        {duration === 'yearly' && <span className="small text-muted ms-1">— Save 2 months!</span>}
                        <i className="bi bi-check-circle-fill text-success ms-auto"></i>
                      </div>
                    ) : (
                      <div className="d-flex gap-3">
                        {['monthly', 'yearly'].map(d => {
                          const level = pricing?.categoryPriceLevel?.[selectedCategory] || 'medium';
                          const price = tier ? pricing?.priceTable?.[tier]?.[level]?.[d] : null;
                          return (
                            <div key={d} className={`flex-fill border rounded-3 p-3 ${duration === d ? 'border-success bg-success bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setDuration(d)}>
                              <div className="fw-semibold text-capitalize">{d}</div>
                              {price && <div className="text-success fw-bold">{price.toLocaleString()} ETB</div>}
                              {d === 'yearly' && <div className="small text-muted">Save 2 months!</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">3. Payment Method *</label>
                    <div className="d-flex flex-column gap-2">
                      {MANUAL_PAYMENT_METHODS.map(pm => (
                        <div key={pm.value} className={`border rounded-3 p-3 ${paymentMethod === pm.value ? 'border-success bg-success bg-opacity-10' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setPayMethod(pm.value)}>
                          <div className="fw-semibold">{pm.label}</div>
                          <div className="small text-muted">Account: <strong>{pm.account}</strong> — Name: <strong>{pm.name}</strong></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment instructions */}
                  {selectedPayment && fee && !existingSub && (
                    <div className="alert alert-info mb-4">
                      <strong>Payment Instructions:</strong><br />
                      Transfer <strong>{fee.toLocaleString()} ETB</strong> to:<br />
                      <strong>{selectedPayment.label}</strong> — Account: <strong>{selectedPayment.account}</strong><br />
                      Name: <strong>{selectedPayment.name}</strong><br />
                      <small className="text-muted">After payment, upload your receipt below.</small>
                    </div>
                  )}

                  {/* Receipt Upload */}
                  {!existingSub && (
                    <div className="mb-4">
                      <label className="form-label fw-semibold">4. Upload Payment Receipt *</label>
                      <input type="file" className="form-control" accept="image/jpeg,image/png,application/pdf" onChange={e => setReceiptFile(e.target.files[0])} required />
                      <div className="form-text">JPEG, PNG, or PDF — max 10 MB</div>
                      {receiptFile && <div className="mt-1 small text-success">✓ {receiptFile.name}</div>}
                    </div>
                  )}

                  {/* Summary */}
                  {fee && selectedCategory && !existingSub && (
                    <div className="bg-light rounded-3 p-3 mb-4">
                      <div className="d-flex justify-content-between"><span>Category:</span><strong>{CATEGORY_LABELS[selectedCategory]}</strong></div>
                      <div className="d-flex justify-content-between"><span>Duration:</span><strong className="text-capitalize">{duration}</strong></div>
                      <div className="d-flex justify-content-between"><span>Payment via:</span><strong>{selectedPayment?.label}</strong></div>
                      <hr className="my-2" />
                      <div className="d-flex justify-content-between fw-bold fs-5"><span>Total:</span><span className="text-success">{fee.toLocaleString()} ETB</span></div>
                    </div>
                  )}

                  <button type="submit" className="btn btn-success w-100 fw-semibold py-2" disabled={submitting || !!existingSub}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting…</> : '📤 Submit Subscription Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: My Subscriptions ── */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">My Subscriptions</h5>

              {mySubscriptions.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <div style={{ fontSize: '2.5rem' }}>📋</div>
                  <p className="mt-2 small">No subscriptions yet.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {mySubscriptions.map(sub => (
                    <div key={sub._id} className="border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold">{CATEGORY_LABELS[sub.categorySlug] || sub.categorySlug}</div>
                          <div className="small text-muted text-capitalize">{sub.duration} · {sub.paymentMethod.toUpperCase()}</div>
                          <div className="small text-muted">{sub.fee?.toLocaleString()} ETB</div>
                        </div>
                        <span className={`badge ${
                          sub.status === 'active'   ? 'bg-success' :
                          sub.status === 'pending'  ? 'bg-warning text-dark' :
                          sub.status === 'expired'  ? 'bg-secondary' :
                          'bg-danger'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      {sub.status === 'active' && sub.expiryDate && (
                        <div className="small text-muted mt-1">
                          Expires: {new Date(sub.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                      {sub.status === 'inactive' && sub.rejectionReason && (
                        <div className="small text-danger mt-1">
                          Rejected: {sub.rejectionReason}
                        </div>
                      )}
                      {sub.status === 'pending' && (
                        <div className="small text-warning mt-1">
                          ⏳ Awaiting admin review
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing reference */}
          {pricing && tier && (
            <div className="card border-0 shadow-sm rounded-3 mt-3">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3">Pricing Reference ({role})</h6>
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Level</th>
                      <th>Monthly</th>
                      <th>Yearly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['low', 'medium', 'high'].map(level => (
                      <tr key={level}>
                        <td className="text-capitalize">{level}</td>
                        <td>{pricing.priceTable[tier][level].monthly.toLocaleString()} ETB</td>
                        <td>{pricing.priceTable[tier][level].yearly.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="small text-muted mt-2">
                  <strong>High:</strong> Real Estate, Automotive, Business<br />
                  <strong>Medium:</strong> Jobs, Services<br />
                  <strong>Low:</strong> Electronics, Fashion, etc.
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
