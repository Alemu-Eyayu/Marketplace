import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

// ─── Design tokens (mirrors CSS variables) ───────────────────────────────────
const C = {
  primary:      '#16a34a',
  primaryDark:  '#15803d',
  primaryLight: '#dcfce7',
  accent:       '#f59e0b',
  text:         '#111827',
  textMuted:    '#6b7280',
  border:       '#e5e7eb',
  bg:           '#f9fafb',
  white:        '#ffffff',
  red:          '#ef4444',
  redLight:     '#fef2f2',
  blue:         '#3b82f6',
  blueLight:    '#eff6ff',
};

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 20, radius = 8, mb = 0 }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: radius,
        background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        marginBottom: mb,
      }}
    />
  );
}

// ─── Spec chip ────────────────────────────────────────────────────────────────
function Chip({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '10px 14px', minWidth: 110,
    }}>
      <span style={{ fontSize: '0.7rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: C.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }) {
  return (
    <div style={{
      flex: '1 1 120px', background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '14px 16px', textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '0.9rem', color: C.text, fontWeight: 700, marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

// ─── Category-specific details ────────────────────────────────────────────────
function CategoryDetails({ listing }) {
  const { categorySlug } = listing;
  let chips = [];

  if (categorySlug === 'real-estate' && listing.realEstate) {
    const r = listing.realEstate;
    chips = [
      { label: 'Type',        value: r.propertyType },
      { label: 'Size',        value: r.sizeSqm ? `${r.sizeSqm} sqm` : null },
      { label: 'Bedrooms',    value: r.bedrooms },
      { label: 'Bathrooms',   value: r.bathrooms },
      { label: 'Furnishing',  value: r.furnishingStatus },
    ];
  } else if (categorySlug === 'automotive' && listing.automotive) {
    const a = listing.automotive;
    chips = [
      { label: 'Make',         value: a.make },
      { label: 'Model',        value: a.model },
      { label: 'Year',         value: a.year },
      { label: 'Mileage',      value: a.mileage ? `${a.mileage.toLocaleString()} km` : null },
      { label: 'Condition',    value: a.condition },
      { label: 'Fuel',         value: a.fuelType },
      { label: 'Transmission', value: a.transmission },
      { label: 'Color',        value: a.color },
      { label: 'Engine',       value: a.engineSize },
    ];
  } else if (categorySlug === 'electronics' && listing.electronics) {
    const e = listing.electronics;
    chips = [
      { label: 'Brand',     value: e.brand },
      { label: 'Model',     value: e.model },
      { label: 'Condition', value: e.condition },
      { label: 'Warranty',  value: e.warranty },
      { label: 'Storage',   value: e.storage },
    ];
  } else if (categorySlug === 'home-furniture' && listing.homeFurniture) {
    const h = listing.homeFurniture;
    chips = [
      { label: 'Sub-category', value: h.subCategory },
      { label: 'Condition',    value: h.condition },
      { label: 'Material',     value: h.material },
    ];
  } else if (categorySlug === 'fashion-clothing' && listing.fashionClothing) {
    const f = listing.fashionClothing;
    chips = [
      { label: 'Brand',     value: f.brand },
      { label: 'Size',      value: f.size },
      { label: 'Condition', value: f.condition },
      { label: 'Color',     value: f.color },
    ];
  } else if (categorySlug === 'sports-fitness' && listing.sportsFitness) {
    const s = listing.sportsFitness;
    chips = [
      { label: 'Brand',     value: s.brand },
      { label: 'Condition', value: s.condition },
    ];
  } else if (categorySlug === 'books-media' && listing.booksMedia) {
    const b = listing.booksMedia;
    chips = [
      { label: 'Author',    value: b.author },
      { label: 'Condition', value: b.condition },
      { label: 'Language',  value: b.language },
    ];
  } else if (categorySlug === 'pets-animals' && listing.petsAnimals) {
    const p = listing.petsAnimals;
    chips = [
      { label: 'Breed',      value: p.breed },
      { label: 'Age',        value: p.age },
      { label: 'Gender',     value: p.gender },
      { label: 'Vaccinated', value: p.vaccinated ? 'Yes' : 'No' },
    ];
  } else if (categorySlug === 'services' && listing.services) {
    const s = listing.services;
    chips = [
      { label: 'Service Type',  value: s.serviceType },
      { label: 'Availability',  value: s.availability },
      { label: 'Experience',    value: s.experience },
    ];
  } else if (categorySlug === 'jobs' && listing.jobs) {
    const j = listing.jobs;
    chips = [
      { label: 'Job Type',        value: j.jobType },
      { label: 'Industry',        value: j.industry },
      { label: 'Experience Level',value: j.experienceLevel },
      { label: 'Salary Range',    value: j.salaryRange },
    ];
  } else if (categorySlug === 'agriculture' && listing.agriculture) {
    const ag = listing.agriculture;
    chips = [
      { label: 'Sub-category', value: ag.subCategory },
      { label: 'Quantity',     value: ag.quantity },
      { label: 'Organic',      value: ag.organic ? 'Yes' : 'No' },
    ];
  }

  const filtered = chips.filter((c) => c.value !== null && c.value !== undefined && c.value !== '');
  if (!filtered.length) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <h5 style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: '1rem' }}>
        <i className="bi bi-list-check me-2" style={{ color: C.primary }}></i>Details
      </h5>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {filtered.map((c) => <Chip key={c.label} label={c.label} value={c.value} />)}
      </div>
    </div>
  );
}

// ─── Lightbox Modal ───────────────────────────────────────────────────────────
function Lightbox({ media, index, onClose, onPrev, onNext }) {
  const item = media[index];
  const isVideo = item?.type === 'video';

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, right: 24,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          borderRadius: '50%', width: 44, height: 44,
          color: '#fff', fontSize: '1.3rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        <i className="bi bi-x-lg"></i>
      </button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.15)', color: '#fff',
        borderRadius: 20, padding: '4px 14px', fontSize: '0.85rem', fontWeight: 600,
        backdropFilter: 'blur(4px)',
      }}>
        {index + 1} / {media.length}
      </div>

      {/* Prev */}
      {media.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '50%', width: 48, height: 48,
            color: '#fff', fontSize: '1.4rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <i className="bi bi-chevron-left"></i>
        </button>
      )}

      {/* Media */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isVideo ? (
          <video
            src={item.src}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12 }}
          />
        ) : (
          <img
            src={item.src}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Next */}
      {media.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '50%', width: 48, height: 48,
            color: '#fff', fontSize: '1.4rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      )}
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);

  const [listing, setListing]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeIdx, setActiveIdx]   = useState(0);
  const [lightbox, setLightbox]     = useState(false);
  const [reportReason, setReport]   = useState('');
  const [reported, setReported]     = useState(false);
  const [contacting, setContacting] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [ownerListings, setOwnerListings] = useState([]);
  const thumbsRef = useRef(null);
  const ownerMenuRef = useRef(null);

  // Build unified media array: images first, then optional video at end
  const media = listing
    ? [
        ...(listing.images || []).map((src) => ({ type: 'image', src })),
        ...(listing.video ? [{ type: 'video', src: listing.video, poster: listing.images?.[0] || '' }] : []),
      ]
    : [];

  useEffect(() => {
    setLoading(true);
    client.get(`/listings/${id}`)
      .then(({ data }) => { setListing(data.listing); setLoading(false); })
      .catch(() => { setError(t('listing.listingNotFound')); setLoading(false); });
  }, [id]);

  // Fetch other active listings by the same owner (excluding current)
  useEffect(() => {
    if (!listing?.owner?._id) return;
    client.get('/search', {
      params: { owner: listing.owner._id, limit: 6, status: 'active' },
    })
      .then(({ data }) => {
        const others = (data.listings || []).filter(l => l._id !== id).slice(0, 5);
        setOwnerListings(others);
      })
      .catch(() => {});
  }, [listing?.owner?._id, id]);

  // Scroll active thumb into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const el = thumbsRef.current.children[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIdx]);

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + media.length) % media.length), [media.length]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % media.length), [media.length]);

  async function handleContact() {
    if (!user) return navigate('/login');
    setContacting(true);
    try {
      const { data } = await client.post('/conversations', { listingId: id });
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
      setContacting(false);
    }
  }

  async function handleReport(e) {
    e.preventDefault();
    try {
      await client.post(`/listings/${id}/report`, { reason: reportReason });
      setReported(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit report.');
    }
  }

  // Close owner menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(e.target)) {
        setOwnerMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleToggleStatus() {
    const newAction = listing.status === 'active' ? 'deactivate' : 'activate';
    setActionLoading('status');
    setOwnerMenuOpen(false);
    try {
      await client.patch(`/listings/${id}/status`, { action: newAction });
      setListing(prev => ({ ...prev, status: newAction === 'activate' ? 'active' : 'inactive' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update listing status.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to permanently delete this listing? This cannot be undone.')) return;
    setActionLoading('delete');
    setOwnerMenuOpen(false);
    try {
      await client.delete(`/listings/${id}`);
      navigate('/my-listings');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete listing.');
      setActionLoading('');
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div className="row g-4">
          <div className="col-lg-7">
            <Skeleton h={420} radius={16} mb={12} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4].map((k) => <Skeleton key={k} w={80} h={60} radius={8} />)}
            </div>
          </div>
          <div className="col-lg-5">
            <Skeleton h={32} mb={12} />
            <Skeleton h={20} w="60%" mb={20} />
            <Skeleton h={48} mb={16} />
            <Skeleton h={56} mb={12} />
            <Skeleton h={56} />
          </div>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="container py-5 text-center">
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>😕</div>
      <h4 style={{ color: C.text }}>{error}</h4>
      <button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>{t('listing.goBack')}</button>
    </div>
  );

  if (!listing) return null;

  const activeMedia = media[activeIdx];
  const isVideo = activeMedia?.type === 'video';

  const statusColor = listing.status === 'active' ? C.primary : C.textMuted;
  const statusBg    = listing.status === 'active' ? C.primaryLight : '#f3f4f6';

  const postedDate = listing.createdAt
    ? new Date(listing.createdAt).toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // Only show deadline for professional-jobs (applicationDeadline field)
  // All other categories do NOT show an expiry/deadline date
  const isProfessionalJob = listing.categorySlug === 'professional-jobs';
  const deadlineDate = isProfessionalJob && listing.professionalJobs?.applicationDeadline
    ? new Date(listing.professionalJobs.applicationDeadline).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .ld-thumb{cursor:pointer;border-radius:8px;overflow:hidden;flex-shrink:0;transition:all .2s;border:2.5px solid transparent;}
        .ld-thumb:hover{border-color:${C.primary};transform:scale(1.04);}
        .ld-thumb.active{border-color:${C.primary};box-shadow:0 0 0 3px ${C.primaryLight};}
        .ld-main-img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in;transition:transform .3s;}
        .ld-main-img:hover{transform:scale(1.015);}
        .ld-nav-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.85);border:none;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.1rem;color:${C.text};box-shadow:0 2px 8px rgba(0,0,0,.18);transition:all .2s;backdrop-filter:blur(4px);}
        .ld-nav-btn:hover{background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.22);}
        .ld-contact-btn{width:100%;padding:15px;background:${C.primary};color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .ld-contact-btn:hover{background:${C.primaryDark};transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.35);}
        .ld-contact-btn:disabled{opacity:.7;cursor:not-allowed;transform:none;}
        .ld-section{background:#fff;border:1px solid ${C.border};border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.05);}
        .ld-owner-card{display:flex;align-items:center;gap:14px;padding:16px;background:${C.bg};border:1px solid ${C.border};border-radius:12px;}
        .ld-owner-avatar{width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid ${C.border};}
        .ld-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:100px;font-size:.75rem;font-weight:700;}
      `}</style>

      <div className="container py-4" style={{ maxWidth: 1100 }}>

        {/* ── Back button + Breadcrumb ── */}
        <div className="d-flex align-items-center gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.primary, fontWeight: 600, fontSize: '0.88rem',
              padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
              flexShrink: 0,
            }}
          >
            <i className="bi bi-arrow-left"></i> {t('listing.back')}
          </button>
          <nav style={{ fontSize: '.85rem', color: C.textMuted }}>
            <Link to="/" style={{ color: C.textMuted, textDecoration: 'none' }}>{t('nav.home')}</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link to="/search" style={{ color: C.textMuted, textDecoration: 'none' }}>{t('nav.listings')}</Link>
            {listing.categorySlug && (
              <>
                <span style={{ margin: '0 8px' }}>›</span>
                <Link to={`/search?category=${listing.categorySlug}`} style={{ color: C.textMuted, textDecoration: 'none', textTransform: 'capitalize' }}>
                  {listing.categorySlug.replace(/-/g, ' ')}
                </Link>
              </>
            )}
            <span style={{ margin: '0 8px' }}>›</span>
            <span style={{ color: C.text, fontWeight: 600 }}>{listing.title}</span>
          </nav>
        </div>

        <div className="row g-4">

          {/* ══════════════════════════════════════════
              LEFT COLUMN — Media
          ══════════════════════════════════════════ */}
          <div className="col-lg-7">

            {/* Main viewer */}
            <div style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              background: '#000', aspectRatio: '16/10',
              boxShadow: '0 8px 32px rgba(0,0,0,.14)',
            }}>
              {media.length === 0 ? (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                  fontSize: '5rem',
                }}>
                  {listing.categorySlug === 'automotive' ? '🚗' : '🏠'}
                </div>
              ) : isVideo ? (
                <video
                  key={activeMedia.src}
                  src={activeMedia.src}
                  poster={activeMedia.poster}
                  controls
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                <img
                  src={activeMedia.src}
                  alt={listing.title}
                  className="ld-main-img"
                  onClick={() => setLightbox(true)}
                />
              )}

              {/* Badges overlay */}
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {listing.isFeatured && (
                  <span className="ld-badge" style={{ background: C.accent, color: '#fff' }}>
                    ⭐ Featured
                  </span>
                )}
                <span className="ld-badge" style={{ background: statusBg, color: statusColor }}>
                  {listing.status === 'active' ? '● Active' : listing.status}
                </span>
              </div>

              {/* Image count */}
              {media.length > 1 && !isVideo && (
                <div style={{
                  position: 'absolute', bottom: 14, right: 14,
                  background: 'rgba(0,0,0,.55)', color: '#fff',
                  borderRadius: 20, padding: '4px 12px', fontSize: '.8rem', fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}>
                  <i className="bi bi-images me-1"></i>{activeIdx + 1} / {media.length}
                </div>
              )}

              {/* Zoom hint */}
              {!isVideo && media.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: 14, left: 14,
                  background: 'rgba(0,0,0,.45)', color: '#fff',
                  borderRadius: 20, padding: '4px 12px', fontSize: '.75rem',
                  backdropFilter: 'blur(4px)',
                }}>
                  <i className="bi bi-zoom-in me-1"></i>Click to zoom
                </div>
              )}

              {/* Prev / Next arrows */}
              {media.length > 1 && (
                <>
                  <button className="ld-nav-btn" style={{ left: 12 }} onClick={prev}>
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button className="ld-nav-btn" style={{ right: 12 }} onClick={next}>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {media.length > 1 && (
              <div
                ref={thumbsRef}
                style={{
                  display: 'flex', gap: 8, marginTop: 12,
                  overflowX: 'auto', paddingBottom: 4,
                  scrollbarWidth: 'thin',
                }}
              >
                {media.map((m, i) => (
                  <div
                    key={i}
                    className={`ld-thumb${i === activeIdx ? ' active' : ''}`}
                    style={{ width: 80, height: 58, flexShrink: 0 }}
                    onClick={() => setActiveIdx(i)}
                  >
                    {m.type === 'video' ? (
                      <div style={{
                        width: '100%', height: '100%',
                        background: '#111', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '1.4rem',
                      }}>
                        <i className="bi bi-play-circle-fill"></i>
                      </div>
                    ) : (
                      <img src={m.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Description ── */}
            <div className="ld-section" style={{ marginTop: 20 }}>
              <h5 style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: '1rem' }}>
                <i className="bi bi-file-text me-2" style={{ color: C.primary }}></i>{t('listing.descriptionLabel')}
              </h5>
              <p style={{ color: C.text, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0, fontSize: '.95rem' }}>
                {listing.description || t('listing.noDescription')}
              </p>
            </div>

            {/* ── Category-specific details ── */}
            {listing.categorySlug && (
              <div className="ld-section">
                <CategoryDetails listing={listing} />
              </div>
            )}

            {/* ── Location ── */}
            {(listing.location?.region || listing.location?.city || listing.location?.address) && (
              <div className="ld-section">
                <h5 style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: '1rem' }}>
                  <i className="bi bi-geo-alt me-2" style={{ color: C.primary }}></i>{t('listing.locationLabel')}
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {listing.location.region && (
                    <Chip label={t('listing.region')} value={listing.location.region} />
                  )}
                  {listing.location.city && (
                    <Chip label="City" value={listing.location.city} />
                  )}
                  {listing.location.address && (
                    <Chip label="Address" value={listing.location.address} />
                  )}
                </div>
              </div>
            )}

            {/* ── Stats row ── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <StatCard icon="👁️" label={t('listing.viewsLabel')} value={listing.viewCount?.toLocaleString()} />
              {postedDate && <StatCard icon="📅" label={t('listing.postedLabel')} value={postedDate} />}
              {deadlineDate && <StatCard icon="📋" label="Application Deadline" value={deadlineDate} />}
              {listing.categorySlug && (
                <StatCard icon="🏷️" label={t('listing.categoryLabel')} value={listing.categorySlug.replace(/-/g, ' ')} />
              )}
            </div>

          </div>

          {/* ══════════════════════════════════════════
              RIGHT COLUMN — Price + Actions + Owner
          ══════════════════════════════════════════ */}
          <div className="col-lg-5">
            <div style={{ position: 'sticky', top: 88 }}>

              {/* Price card */}
              <div className="ld-section" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{
                    fontSize: '2.2rem', fontWeight: 900, color: C.primary, letterSpacing: '-1px',
                  }}>
                    {listing.price?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '1rem', color: C.textMuted, fontWeight: 600, marginLeft: 6 }}>
                    {listing.currency || 'ETB'}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>
                  {listing.title}
                </h2>

                {(listing.location?.city || listing.location?.region) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: '.875rem', marginBottom: 14 }}>
                    <i className="bi bi-geo-alt-fill" style={{ color: C.primary }}></i>
                    {[listing.location.city, listing.location.region].filter(Boolean).join(', ')}
                  </div>
                )}

                {/* Status + featured badges */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  <span className="ld-badge" style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>
                    {listing.status === 'active' ? '● Active' : listing.status}
                  </span>
                  {listing.isFeatured && (
                    <span className="ld-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                      ⭐ Featured
                    </span>
                  )}
                  {listing.approvalStatus === 'approved' && (
                    <span className="ld-badge" style={{ background: C.primaryLight, color: C.primary, border: `1px solid ${C.primary}33` }}>
                      ✓ Verified
                    </span>
                  )}
                </div>

                {/* Contact button — hidden for the listing owner */}
                {(!user || user._id !== listing.owner?._id?.toString()) && (
                  <>
                    <button
                      className="ld-contact-btn"
                      onClick={handleContact}
                      disabled={contacting}
                    >
                      {contacting
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('listing.connecting')}</>
                        : <><i className="bi bi-chat-dots-fill"></i>{t('listing.contactSeller')}</>
                      }
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '.78rem', color: C.textMuted, marginTop: 10, marginBottom: 0 }}>
                      <i className="bi bi-shield-check me-1" style={{ color: C.primary }}></i>
                      {t('listing.safeMessaging')}
                    </p>
                  </>
                )}

                {/* Owner sees this instead */}
                {user && user._id === listing.owner?._id?.toString() && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ textAlign: 'center', padding: '10px 12px', background: C.primaryLight, borderRadius: 12, fontSize: '.85rem', color: C.primary, fontWeight: 600 }}>
                      <i className="bi bi-person-check me-2"></i>{t('listing.yourListing')}
                    </div>
                    {/* 3-dot owner actions dropdown */}
                    <div ref={ownerMenuRef} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setOwnerMenuOpen(p => !p)}
                        disabled={!!actionLoading}
                        style={{
                          width: '100%', padding: '10px 16px', borderRadius: 12,
                          border: `1.5px solid ${C.border}`, background: C.white,
                          cursor: 'pointer', fontWeight: 700, fontSize: '.9rem',
                          color: C.text, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 8,
                        }}
                      >
                        {actionLoading
                          ? <><span className="spinner-border spinner-border-sm"></span> Working…</>
                          : <><i className="bi bi-three-dots"></i> Manage Listing</>
                        }
                      </button>

                      {ownerMenuOpen && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                          background: C.white, border: `1px solid ${C.border}`,
                          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          zIndex: 100, overflow: 'hidden',
                        }}>
                          {/* Edit */}
                          <Link
                            to={`/listings/${listing._id}/edit`}
                            onClick={() => setOwnerMenuOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 16px', textDecoration: 'none',
                              color: C.text, fontSize: '.9rem', fontWeight: 600,
                              borderBottom: `1px solid ${C.border}`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <i className="bi bi-pencil-square" style={{ color: C.primary, fontSize: '1rem' }}></i>
                            Edit Listing
                          </Link>

                          {/* Activate / Deactivate */}
                          <button
                            onClick={handleToggleStatus}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 16px', background: 'transparent', border: 'none',
                              color: C.text, fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
                              borderBottom: `1px solid ${C.border}`, textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.bg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {listing.status === 'active'
                              ? <><i className="bi bi-pause-circle" style={{ color: C.accent, fontSize: '1rem' }}></i> Deactivate</>
                              : <><i className="bi bi-play-circle" style={{ color: C.primary, fontSize: '1rem' }}></i> Activate</>
                            }
                          </button>

                          {/* Delete */}
                          <button
                            onClick={handleDelete}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 16px', background: 'transparent', border: 'none',
                              color: C.red, fontSize: '.9rem', fontWeight: 600, cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.redLight}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <i className="bi bi-trash3" style={{ fontSize: '1rem' }}></i>
                            Delete Listing
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Owner card */}
              {listing.owner && (
                <div className="ld-section" style={{ marginBottom: 16 }}>
                  <h6 style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: '.9rem' }}>
                    <i className="bi bi-person-circle me-2" style={{ color: C.primary }}></i>{t('listing.seller')}
                  </h6>
                  <div className="ld-owner-card">
                    <img
                      src={listing.owner.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(listing.owner.fullName || 'U')}&background=dcfce7&color=16a34a&bold=true`}
                      alt={listing.owner.fullName}
                      className="ld-owner-avatar"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: '.95rem', marginBottom: 2 }}>
                        {listing.owner.fullName}
                      </div>
                      <div style={{ fontSize: '.78rem', color: C.textMuted, textTransform: 'capitalize' }}>
                        {listing.owner.role}
                        {listing.owner.verificationStatus === 'verified' && (
                          <span style={{ marginLeft: 6, color: C.primary, fontWeight: 700 }}>✓ Verified</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleContact}
                      style={{
                        background: C.primaryLight, color: C.primary,
                        border: `1px solid ${C.primary}33`, borderRadius: 8,
                        padding: '6px 14px', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: (user && user._id === listing.owner?._id?.toString()) ? 'none' : 'block',
                      }}
                    >
                      Message
                    </button>
                  </div>
                </div>
              )}

              {/* Quick info card */}
              <div className="ld-section" style={{ marginBottom: 16 }}>
                <h6 style={{ fontWeight: 700, color: C.text, marginBottom: 14, fontSize: '.9rem' }}>
                  <i className="bi bi-info-circle me-2" style={{ color: C.primary }}></i>Quick Info
                </h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: '🏷️', label: 'Category',  value: listing.categorySlug?.replace(/-/g, ' ') },
                    { icon: '📅', label: 'Posted',     value: postedDate },
                    ...(deadlineDate ? [{ icon: '📋', label: 'Application Deadline', value: deadlineDate }] : []),
                    { icon: '👁️', label: 'Views',      value: listing.viewCount?.toLocaleString() },
                    { icon: '📍', label: 'Location',   value: [listing.location?.city, listing.location?.region].filter(Boolean).join(', ') || null },
                  ].filter((r) => r.value).map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.875rem' }}>
                      <span style={{ color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{row.icon}</span>{row.label}
                      </span>
                      <span style={{ color: C.text, fontWeight: 600, textTransform: 'capitalize', textAlign: 'right', maxWidth: '55%' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety tips */}
              <div style={{
                background: C.blueLight, border: `1px solid #bfdbfe`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
              }}>
                <div style={{ fontWeight: 700, color: C.blue, fontSize: '.85rem', marginBottom: 8 }}>
                  <i className="bi bi-shield-check me-2"></i>Safety Tips
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.8rem', color: '#1e40af', lineHeight: 1.7 }}>
                  <li>Meet in a safe, public place</li>
                  <li>Never pay before seeing the item</li>
                  <li>Use EthioGebiya's secure messaging</li>
                  <li>Verify the seller's identity</li>
                </ul>
              </div>

              {/* Report */}
              {user && !reported && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', fontSize: '.8rem', color: C.textMuted, userSelect: 'none' }}>
                    <i className="bi bi-flag me-1"></i>{t('listing.reportListing')}
                  </summary>
                  <form onSubmit={handleReport} style={{ marginTop: 10 }}>
                    <textarea
                      rows={2}
                      className="form-control form-control-sm"
                      placeholder={t('listing.reportReason')}
                      value={reportReason}
                      onChange={(e) => setReport(e.target.value)}
                      required
                      style={{ marginBottom: 8, fontSize: '.8rem' }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: C.redLight, color: C.red,
                        border: `1px solid ${C.red}44`, borderRadius: 8,
                        padding: '6px 14px', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {t('listing.submitReport')}
                    </button>
                  </form>
                </details>
              )}
              {reported && (
                <div style={{
                  background: C.primaryLight, color: C.primary,
                  borderRadius: 10, padding: '10px 14px', fontSize: '.85rem', fontWeight: 600,
                }}>
                  <i className="bi bi-check-circle me-2"></i>{t('listing.reportSubmitted')}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── More from this seller / My other listings ── */}
      {ownerListings.length > 0 && (() => {
        const isOwner = user && user._id === listing.owner?._id?.toString();
        return (
          <div className="container py-4" style={{ maxWidth: 1100 }}>
            <style>{`
              .rec-card { transition: all 0.22s ease; cursor: pointer; }
              .rec-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(22,163,74,0.13) !important; border-color: ${C.primary} !important; }
              .rec-scroll::-webkit-scrollbar { height: 4px; }
              .rec-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 99px; }
              .rec-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h5 style={{ fontWeight: 800, color: C.text, margin: 0 }}>
                  {isOwner ? 'My Other Listings' : `More from ${listing.owner?.fullName || 'this seller'}`}
                </h5>
                <p style={{ color: C.textMuted, fontSize: '.82rem', margin: '2px 0 0' }}>
                  {isOwner ? 'Your other active listings' : 'Other listings by the same seller'}
                </p>
              </div>
              {isOwner && (
                <Link
                  to="/my-listings"
                  style={{
                    fontSize: '.82rem', fontWeight: 700, color: C.primary,
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  View all <i className="bi bi-arrow-right"></i>
                </Link>
              )}
            </div>

            <div
              className="rec-scroll"
              style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}
            >
              {ownerListings.map((l) => (
                <Link
                  key={l._id}
                  to={`/listings/${l._id}`}
                  style={{ textDecoration: 'none', flexShrink: 0, width: 220 }}
                >
                  <div
                    className="rec-card"
                    style={{
                      background: C.white, border: `1px solid ${C.border}`,
                      borderRadius: 14, overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ height: 140, overflow: 'hidden', background: C.bg, position: 'relative' }}>
                      {l.images?.[0] ? (
                        <img src={l.images[0]} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🏷️</div>
                      )}
                      {l.isFeatured && (
                        <span style={{ position: 'absolute', top: 8, left: 8, background: C.accent, color: '#fff', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                        {l.title}
                      </div>
                      {l.price > 0 && (
                        <div style={{ color: C.primary, fontWeight: 800, fontSize: '.9rem', marginBottom: 4 }}>
                          {l.price.toLocaleString()} ETB
                        </div>
                      )}
                      <div style={{ color: C.textMuted, fontSize: '.72rem' }}>
                        📍 {[l.location?.city, l.location?.region].filter(Boolean).join(', ') || 'Ethiopia'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Lightbox */}
      {lightbox && media.length > 0 && (
        <Lightbox
          media={media}
          index={activeIdx}
          onClose={() => setLightbox(false)}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
}
