import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import client from '../api/client';

const CATEGORY_LIST = [
  { slug: 'real-estate',         label: '🏠 Real Estate' },
  { slug: 'automotive',          label: '🚗 Automotive' },
  { slug: 'electronics',         label: '📱 Electronics' },
  { slug: 'home-furniture',      label: '🛋️ Home & Furniture' },
  { slug: 'fashion-clothing',    label: '👕 Fashion & Clothing' },
  { slug: 'sports-fitness',      label: '⚽ Sports & Fitness' },
  { slug: 'books-media',         label: '📚 Books & Media' },
  { slug: 'pets-animals',        label: '🐾 Pets & Animals' },
  { slug: 'services',            label: '🔧 Services' },
  { slug: 'domestic-jobs',       label: '🏡 Domestic Jobs' },
  { slug: 'professional-jobs',   label: '💼 Professional Jobs' },
  { slug: 'business-industrial', label: '🏭 Business & Industrial' },
  { slug: 'agriculture',         label: '🌾 Agriculture' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_LIST.map(c => [c.slug, c.label]));

const PRICE_TABLE = {
  basic:    { low: { monthly: 50,   yearly: 500  }, medium: { monthly: 100,  yearly: 1000 }, high: { monthly: 200,  yearly: 2000  } },
  standard: { low: { monthly: 150,  yearly: 1500 }, medium: { monthly: 300,  yearly: 3000 }, high: { monthly: 600,  yearly: 6000  } },
  premium:  { low: { monthly: 300,  yearly: 3000 }, medium: { monthly: 600,  yearly: 6000 }, high: { monthly: 1200, yearly: 12000 } },
};
const ROLE_TIER = { user: 'basic', broker: 'standard', company: 'premium' };
const CATEGORY_LEVEL = {
  'real-estate': 'high', 'automotive': 'high', 'business-industrial': 'high',
  'professional-jobs': 'medium', 'domestic-jobs': 'medium', 'services': 'medium',
  'electronics': 'low', 'home-furniture': 'low', 'fashion-clothing': 'low',
  'sports-fitness': 'low', 'books-media': 'low', 'pets-animals': 'low', 'agriculture': 'low',
};

// Categories blocked per role
const COMPANY_ONLY      = ['professional-jobs', 'services'];
const BROKER_OR_COMPANY = ['domestic-jobs', 'business-industrial', 'agriculture'];

function getBlockedReason(role, slug) {
  const catLabel = CATEGORY_LABELS[slug] || slug;
  if (role === 'user') {
    if (COMPANY_ONLY.includes(slug)) {
      return {
        title: 'Not available for individual accounts',
        message: `The "${catLabel}" category is only available for verified and registered companies.`,
        cta: 'Register as Company', ctaLink: '/register-company',
      };
    }
    if (BROKER_OR_COMPANY.includes(slug)) {
      return {
        title: 'Not available for individual accounts',
        message: `The "${catLabel}" category is only available for verified brokers and registered companies.`,
        cta: 'Register as Broker', ctaLink: '/register?role=broker',
      };
    }
  }
  if (role === 'broker' && COMPANY_ONLY.includes(slug)) {
    return {
      title: 'Not available for broker accounts',
      message: `The "${catLabel}" category is only available for verified and registered companies.`,
      cta: 'Register as Company', ctaLink: '/register-company',
    };
  }
  return null;
}

function getVerificationBlock(role, verificationStatus) {
  if (verificationStatus === 'verified') return null;
  if (role === 'user') return {
    icon: '🔍',
    title: 'Account not yet verified',
    message: 'Your account is pending admin verification. You will be able to create listings once an admin verifies your identity.',
  };
  if (role === 'broker') return {
    icon: '⏳',
    title: 'Broker account pending approval',
    message: 'Your broker account is pending admin approval. You will be able to create listings once your license is verified.',
  };
  if (role === 'company') return {
    icon: '🏢',
    title: 'Company registration pending approval',
    message: 'Your company registration is pending admin approval. You will be able to create listings once your company is verified.',
  };
  return null;
}

export default function PlanSelectionModal({ categorySlug: initialCategorySlug, userRole, onClose }) {
  const navigate = useNavigate();
  const reduxUser = useSelector((s) => s.auth.user);
  const hasUsedFreeTrial = reduxUser?.hasUsedFreeTrial || false;

  // For company users, always resolve verification status from the company document
  // to avoid stale Redux state after admin approval
  const [resolvedVerificationStatus, setResolvedVerificationStatus] = useState(
    reduxUser?.verificationStatus || 'none'
  );
  const [verificationLoading, setVerificationLoading] = useState(userRole === 'company');

  useEffect(() => {
    if (userRole !== 'company') {
      setResolvedVerificationStatus(reduxUser?.verificationStatus || 'none');
      return;
    }
    // Live-check company verification status
    client.get('/companies/me')
      .then(({ data }) => {
        setResolvedVerificationStatus(data.company?.verificationStatus || 'pending');
      })
      .catch(() => {
        setResolvedVerificationStatus(reduxUser?.verificationStatus || 'pending');
      })
      .finally(() => setVerificationLoading(false));
  }, [userRole]);

  const verificationBlock = verificationLoading ? null : getVerificationBlock(userRole, resolvedVerificationStatus);

  const [step, setStep] = useState(initialCategorySlug ? 'plan' : 'category');
  const [selectedSlug, setSelectedSlug] = useState(initialCategorySlug || '');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [checkingSubscription, setCheckingSubscription] = useState(!!initialCategorySlug);

  useEffect(() => {
    if (verificationLoading) return;
    if (!initialCategorySlug || verificationBlock) return;

    const blocked = getBlockedReason(userRole, initialCategorySlug);
    if (blocked) {
      setStep('blocked');
      setCheckingSubscription(false);
      return;
    }

    setCheckingSubscription(true);
    client.get('/premium-subscriptions/my')
      .then(({ data }) => {
        const subs = data.subscriptions || [];
        setActiveSubscriptions(subs);
        const hasActive = subs.some(s => s.categorySlug === initialCategorySlug && s.status === 'active');
        if (hasActive) { onClose(); navigate(`/listings/create?category=${initialCategorySlug}`); }
      })
      .catch(() => {})
      .finally(() => setCheckingSubscription(false));
  }, [initialCategorySlug, verificationLoading]);

  function hasActiveSub(slug) {
    return activeSubscriptions.some(s => s.categorySlug === slug && s.status === 'active');
  }

  const tier     = ROLE_TIER[userRole] || 'basic';
  const level    = CATEGORY_LEVEL[selectedSlug] || 'medium';
  const prices   = PRICE_TABLE[tier]?.[level] || { monthly: 100, yearly: 1000 };
  const catLabel = CATEGORY_LABELS[selectedSlug] || selectedSlug;

  function handleCategorySelect(slug) {
    const blocked = getBlockedReason(userRole, slug);
    if (blocked) { setSelectedSlug(slug); setStep('blocked'); return; }
    if (hasActiveSub(slug)) { onClose(); navigate(`/listings/create?category=${slug}`); return; }
    setSelectedSlug(slug);
    setStep('plan');
  }

  function handleFreeTrial() { onClose(); navigate(`/listings/create?category=${selectedSlug}`); }
  function handlePremium(duration) { onClose(); navigate(`/premium-subscription?category=${selectedSlug}&duration=${duration}`); }

  return (
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 480 }}>
        <div className="modal-content rounded-4 border-0 shadow-lg">

          {/* ── Verification required ── */}
          {verificationBlock ? (
            <>
              <div className="modal-header border-0 pb-0">
                <button className="btn-close ms-auto" onClick={onClose}></button>
              </div>
              <div className="modal-body px-4 pb-4 pt-2 text-center">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>{verificationBlock.icon}</div>
                <h5 className="fw-bold mb-2">{verificationBlock.title}</h5>
                <p className="text-muted small mb-4">{verificationBlock.message}</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>Close</button>
                  <button className="btn btn-success rounded-pill px-4" onClick={() => { onClose(); navigate('/profile'); }}>
                    Go to Profile
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Loading verification or subscription */}
          {(checkingSubscription || verificationLoading) && (
                <div className="modal-body text-center py-5">
                  <div className="spinner-border text-success" role="status"></div>
                  <p className="text-muted mt-3 mb-0">Checking subscription...</p>
                </div>
              )}

              {/* Blocked: role restriction */}
              {!checkingSubscription && !verificationLoading && step === 'blocked' && (() => {
                const blocked = getBlockedReason(userRole, selectedSlug || initialCategorySlug);
                return (
                  <>
                    <div className="modal-header border-0 pb-0">
                      <button className="btn-close ms-auto" onClick={onClose}></button>
                    </div>
                    <div className="modal-body px-4 pb-4 pt-2 text-center">
                      <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
                      <h5 className="fw-bold mb-2">{blocked?.title}</h5>
                      <p className="text-muted small mb-4">{blocked?.message}</p>
                      <div className="d-flex gap-2 justify-content-center flex-wrap">
                        <button className="btn btn-outline-secondary rounded-pill px-4" onClick={onClose}>Go Back</button>
                        {blocked?.cta && (
                          <a href={blocked.ctaLink} className="btn btn-success rounded-pill px-4">{blocked.cta}</a>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Step 1: Category picker */}
              {!checkingSubscription && !verificationLoading && step === 'category' && (
                <>
                  <div className="modal-header border-0 pb-0">
                    <div>
                      <h5 className="modal-title fw-bold">Choose a Category</h5>
                      <p className="text-muted small mb-0">Select the category you want to post in</p>
                    </div>
                    <button className="btn-close" onClick={onClose}></button>
                  </div>
                  <div className="modal-body pt-3 pb-4 px-4">
                    <div className="row g-2">
                      {CATEGORY_LIST.map(cat => {
                        const isBlocked = !!getBlockedReason(userRole, cat.slug);
                        return (
                          <div key={cat.slug} className="col-6">
                            <div
                              className="border rounded-3 p-2 d-flex align-items-center gap-2"
                              style={{ cursor: 'pointer', transition: 'all 0.15s', fontSize: '0.85rem', opacity: isBlocked ? 0.5 : 1 }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = isBlocked ? '#ef4444' : '#198754'; e.currentTarget.style.background = isBlocked ? '#fef2f2' : '#f0fdf4'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
                              onClick={() => handleCategorySelect(cat.slug)}
                            >
                              <span style={{ fontSize: '1.2rem' }}>{cat.label.split(' ')[0]}</span>
                              <span className="fw-semibold text-truncate flex-grow-1">{cat.label.replace(/^\S+\s/, '')}</span>
                              {isBlocked && <i className="bi bi-lock-fill text-danger flex-shrink-0" style={{ fontSize: '0.7rem' }}></i>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Plan picker */}
              {!checkingSubscription && !verificationLoading && step === 'plan' && (
                <>
                  <div className="modal-header border-0 pb-0">
                    <div>
                      <h5 className="modal-title fw-bold">Choose Your Plan</h5>
                      <p className="text-muted small mb-0">
                        Posting in: <strong>{catLabel}</strong>
                        {!initialCategorySlug && (
                          <button className="btn btn-link btn-sm p-0 ms-2 text-muted" style={{ fontSize: '0.75rem', verticalAlign: 'baseline' }} onClick={() => setStep('category')}>(change)</button>
                        )}
                      </p>
                    </div>
                    <button className="btn-close" onClick={onClose}></button>
                  </div>
                  <div className="modal-body pt-3 pb-4 px-4">
                    <div className="d-flex flex-column gap-3">

                      {/* Free Trial */}
                      <div
                        className={`border rounded-3 p-3 d-flex align-items-center gap-3 ${hasUsedFreeTrial ? 'opacity-50' : ''}`}
                        style={{ cursor: hasUsedFreeTrial ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { if (!hasUsedFreeTrial) e.currentTarget.style.borderColor = '#198754'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = ''; }}
                        onClick={hasUsedFreeTrial ? undefined : handleFreeTrial}
                      >
                        <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>🆓</div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">Free Trial</div>
                          <div className="small text-muted">{hasUsedFreeTrial ? 'You have already used your free trial.' : 'Post 1 listing for free. No payment required.'}</div>
                        </div>
                        <div className="fw-bold text-success">{hasUsedFreeTrial ? <span className="badge bg-secondary">Used</span> : 'Free'}</div>
                      </div>

                      {/* Premium Monthly */}
                      <div
                        className="border rounded-3 p-3 d-flex align-items-center gap-3"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#198754'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                        onClick={() => handlePremium('monthly')}
                      >
                        <div className="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>⭐</div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">Premium Monthly</div>
                          <div className="small text-muted">Up to 100 listings for 30 days.</div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-success">{prices.monthly.toLocaleString()} ETB</div>
                          <div className="small text-muted">/month</div>
                        </div>
                      </div>

                      {/* Premium Yearly */}
                      <div
                        className="border border-success rounded-3 p-3 d-flex align-items-center gap-3 position-relative"
                        style={{ cursor: 'pointer', transition: 'all 0.2s', background: '#f0fdf4' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(25,135,84,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                        onClick={() => handlePremium('yearly')}
                      >
                        <span className="position-absolute top-0 end-0 badge bg-success rounded-pill me-2 mt-2" style={{ fontSize: '0.65rem' }}>BEST VALUE</span>
                        <div className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>🏆</div>
                        <div className="flex-grow-1">
                          <div className="fw-bold">Premium Yearly</div>
                          <div className="small text-muted">Up to 1,500 listings for 365 days. Save 2 months!</div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-success">{prices.yearly.toLocaleString()} ETB</div>
                          <div className="small text-muted">/year</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
