import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import PlanSelectionModal from '../components/PlanSelectionModal';
import heroBg from '../assets/home1.jpg';

// Icon map for known category slugs — fallback to 🏷️
const CATEGORY_ICONS = {
  'real-estate':       '🏠',
  'automotive':        '🚗',
  'electronics':       '📱',
  'home-furniture':    '🛋️',
  'fashion-clothing':  '👗',
  'sports-fitness':    '⚽',
  'books-media':       '📚',
  'pets-animals':      '🐾',
  'services':          '🔧',
  'domestic-jobs':     '🏡',
  'professional-jobs': '💼',
  'business-industrial': '🏭',
  'agriculture':       '🌾',
};

// Hero quick-pick chips (always shown, fixed set)
const HERO_CHIPS = [
  { slug: 'real-estate',       label: 'Real Estate',   icon: '🏠' },
  { slug: 'automotive',        label: 'Automotive',    icon: '🚗' },
  { slug: 'electronics',       label: 'Electronics',   icon: '📱' },
  { slug: 'domestic-jobs',     label: 'Domestic Jobs', icon: '🏡' },
  { slug: 'professional-jobs', label: 'Pro Jobs',      icon: '💼' },
  { slug: 'pets-animals',      label: 'Pets',          icon: '🐾' },
];


// Hero search bar component
function HeroSearch() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate('/search');
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="hero-search-wrap">
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔍</span>
        <input
          className="hero-search-input"
          type="text"
          placeholder="Search listings — cars, homes, jobs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search listings"
        />
        <button type="submit" className="hero-search-btn">Search</button>
      </div>
    </form>
  );
}

function CategoriesSection({ user }) {
  const [expanded, setExpanded] = useState(false);
  const [planModal, setPlanModal] = useState(null); // { categorySlug }
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch all active categories from the API
  useEffect(() => {
    client.get('/categories')
      .then(({ data }) => {
        if (data.categories) {
          setCategories(
            data.categories.map((cat) => ({
              slug: cat.slug,
              label: cat.name?.en || cat.slug,
              icon: CATEGORY_ICONS[cat.slug] || '🏷️',
            }))
          );
        }
      })
      .catch(() => {
        // Fallback to a minimal hardcoded list if API fails
        setCategories([
          { slug: 'real-estate',       label: 'Real Estate',      icon: '🏠' },
          { slug: 'automotive',        label: 'Automotive',       icon: '🚗' },
          { slug: 'electronics',       label: 'Electronics',      icon: '📱' },
          { slug: 'home-furniture',    label: 'Home & Furniture',  icon: '🛋️' },
          { slug: 'fashion-clothing',  label: 'Fashion & Clothing',icon: '👗' },
          { slug: 'sports-fitness',    label: 'Sports & Fitness',  icon: '⚽' },
          { slug: 'books-media',       label: 'Books & Media',     icon: '📚' },
          { slug: 'pets-animals',      label: 'Pets',              icon: '🐾' },
          { slug: 'services',          label: 'Services',          icon: '🔧' },
          { slug: 'domestic-jobs',     label: 'Domestic Jobs',     icon: '🏡' },
          { slug: 'professional-jobs', label: 'Pro Jobs',          icon: '💼' },
          { slug: 'business-industrial', label: 'Business',        icon: '🏭' },
          { slug: 'agriculture',       label: 'Agriculture',       icon: '🌾' },
        ]);
      });
  }, []);

  function handleCategoryClick(slug) {
    // If logged in non-admin user, show plan selection
    if (user && user.role !== 'admin') {
      setPlanModal({ categorySlug: slug });
    } else if (!user) {
      // Not logged in — go to search
      navigate(`/search?category=${slug}`);
    } else {
      // Admin — go directly to create listing
      navigate(`/listings/create?category=${slug}`);
    }
  }

  return (
    <section className="py-5 bg-light">
      <style>{`
        @keyframes catFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0); }
          40%       { transform: translateY(-6px); }
          60%       { transform: translateY(-3px); }
        }
        .cat-card {
          animation: catFadeIn 0.4s ease both;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .cat-card:hover {
          border-color: #198754 !important;
          box-shadow: 0 6px 18px rgba(25,135,84,0.15) !important;
          transform: translateY(-4px) scale(1.04);
          background: #f0fdf4 !important;
        }
        .cat-card:hover .cat-icon {
          animation: iconBounce 0.5s ease;
        }
        .cat-card:active {
          transform: translateY(-1px) scale(1.01);
        }
        @keyframes gridFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cat-grid-expanded {
          animation: gridFadeIn 0.35s ease both;
        }
      `}</style>
      <div className="container">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 fw-bold mb-0">{t('home.browseCategory')}</h2>
          <button
            className="btn btn-sm btn-outline-success rounded-pill fw-semibold"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t('home.showLess') : t('home.viewAllCats')}
          </button>
        </div>

        {/* Collapsed: horizontal scroll row */}
        {!expanded && (
          <div
            className="d-flex gap-3 pb-2"
            style={{ overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {categories.map((cat, idx) => (
              <div
                key={cat.slug}
                className="text-decoration-none flex-shrink-0"
                style={{ minWidth: 90, cursor: 'pointer' }}
                onClick={() => handleCategoryClick(cat.slug)}
              >
                <div
                  className="cat-card bg-white border rounded-3 text-center p-3 h-100"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="cat-icon" style={{ fontSize: '1.8rem' }}>{cat.icon}</div>
                  <div className="small fw-semibold text-dark mt-2" style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                    {cat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded: full grid, larger cards */}
        {expanded && (
          <div className="row g-3 cat-grid-expanded">
            {categories.map((cat, idx) => (
              <div key={cat.slug} className="col-6 col-sm-4 col-md-3 col-lg-2">
                <div
                  className="text-decoration-none"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCategoryClick(cat.slug)}
                >
                  <div
                    className="cat-card bg-white border rounded-3 text-center p-4 h-100"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <div className="cat-icon" style={{ fontSize: '2.5rem' }}>{cat.icon}</div>
                    <div className="fw-semibold text-dark mt-2" style={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                      {cat.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Plan Selection Modal */}
      {planModal && (
        <PlanSelectionModal
          categorySlug={planModal.categorySlug}
          userRole={user?.role}
          onClose={() => setPlanModal(null)}
        />
      )}

    </section>
  );
}

export default function Home() {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homePlanModal, setHomePlanModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const { data } = await client.get('/search', { params: { limit: 6 } });
        if (isMounted) setFeatured(data.listings || []);
      } catch {
        // silent fail
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    const timer = setTimeout(fetchFeatured, 100);
    return () => { isMounted = false; clearTimeout(timer); };
  }, []);

  return (
    <>

      {/* ── HERO ── */}
      <section className="position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdf8 0%, #ecfdf5 50%, #f8fafc 100%)', minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
        <style>{`
          /* ── Hero animations ── */
          @keyframes heroFadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes heroImgReveal {
            from { opacity: 0; transform: scale(1.08); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes floatBadge {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-8px); }
          }
          @keyframes pulseGreen {
            0%, 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
            50%       { box-shadow: 0 0 0 10px rgba(5,150,105,0); }
          }
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          .hero-h-1 { animation: heroFadeUp 0.7s 0.05s ease both; }
          .hero-h-2 { animation: heroFadeUp 0.7s 0.20s ease both; }
          .hero-h-3 { animation: heroFadeUp 0.7s 0.35s ease both; }
          .hero-h-4 { animation: heroFadeUp 0.7s 0.50s ease both; }
          .hero-h-5 { animation: heroFadeUp 0.7s 0.65s ease both; }
          .hero-img-wrap { animation: heroImgReveal 1.1s 0.1s ease both; }

          /* Gradient headline text */
          .hero-gradient-text {
            background: linear-gradient(135deg, #059669 0%, #10b981 50%, #047857 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 4s linear infinite;
          }

          /* Search bar */
          .hero-search-wrap {
            background: #fff;
            border: 1.5px solid #d1fae5;
            border-radius: 16px;
            padding: 6px 6px 6px 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 24px rgba(5,150,105,0.08);
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .hero-search-wrap:focus-within {
            border-color: #10b981;
            box-shadow: 0 4px 24px rgba(5,150,105,0.18);
          }
          .hero-search-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #1a1a1a;
            font-size: 0.95rem;
          }
          .hero-search-input::placeholder { color: #9ca3af; }
          .hero-search-btn {
            background: linear-gradient(135deg, #059669, #10b981);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-weight: 700;
            font-size: 0.88rem;
            padding: 10px 22px;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.15s;
            white-space: nowrap;
            box-shadow: 0 2px 12px rgba(5,150,105,0.3);
          }
          .hero-search-btn:hover { opacity: 0.9; transform: scale(1.03); }

          /* Category pills */
          .hero-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: #fff;
            border: 1.5px solid #d1fae5;
            border-radius: 50px;
            padding: 6px 14px;
            font-size: 0.78rem;
            font-weight: 600;
            color: #374151;
            text-decoration: none;
            transition: all 0.2s ease;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          }
          .hero-pill:hover {
            background: #ecfdf5;
            border-color: #10b981;
            color: #065f46;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(5,150,105,0.15);
          }

          /* Stat cards */
          .hero-stat {
            text-align: center;
            padding: 14px 20px;
            background: #fff;
            border: 1.5px solid #d1fae5;
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(5,150,105,0.07);
            flex: 1;
            min-width: 90px;
          }
          .hero-stat-num {
            font-size: 1.4rem;
            font-weight: 800;
            color: #059669;
            line-height: 1;
          }
          .hero-stat-label {
            font-size: 0.68rem;
            color: #6b7280;
            margin-top: 4px;
            line-height: 1.3;
          }

          /* Floating badges on image */
          .hero-float-badge {
            position: absolute;
            background: rgba(255,255,255,0.95);
            border: 1.5px solid #d1fae5;
            border-radius: 14px;
            padding: 10px 14px;
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            animation: floatBadge 4s ease-in-out infinite;
          }
          .hero-float-badge-2 {
            animation-delay: 2s;
          }
          .hero-live-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: #10b981;
            animation: pulseGreen 2s ease-in-out infinite;
            flex-shrink: 0;
          }

          /* Image overlay gradient */
          .hero-img-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to right,
              rgba(240,253,248,0.6) 0%,
              rgba(240,253,248,0.1) 40%,
              transparent 100%
            );
          }

          /* Decorative blobs */
          .hero-blob-1 {
            position: absolute;
            width: 600px; height: 600px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
            top: -150px; left: -200px;
            pointer-events: none;
          }
          .hero-blob-2 {
            position: absolute;
            width: 400px; height: 400px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%);
            bottom: -100px; right: 25%;
            pointer-events: none;
          }

          @media (max-width: 991px) {
            .hero-img-col { display: none !important; }
          }
        `}</style>

        {/* Decorative blobs */}
        <div className="hero-blob-1" aria-hidden="true" />
        <div className="hero-blob-2" aria-hidden="true" />

        <div className="container position-relative" style={{ zIndex: 2, padding: '2rem 1rem' }}>
          <div className="row align-items-center g-5">

            {/* ── LEFT: Text content ── */}
            <div className="col-lg-6">

              {/* Eyebrow */}
              <div className="hero-h-1 mb-4">
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: 50, padding: '6px 18px',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: '#065f46', letterSpacing: '0.06em',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulseGreen 2s ease-in-out infinite' }} />
                  🇪🇹 Ethiopia's #1 Marketplace
                </span>
              </div>

              {/* Headline */}
              <h1 className="hero-h-2 fw-bolder mb-3" style={{
                fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: '#111827',
              }}>
                Find Anything.<br />
                <span className="hero-gradient-text">Sell Everything.</span><br />
                <span style={{ color: '#6b7280', fontSize: '80%', fontWeight: 600 }}>
                  Right Here in Ethiopia.
                </span>
              </h1>

              {/* Sub-text */}
              <p className="hero-h-3 mb-4" style={{ color: '#4b5563', fontSize: '1rem', lineHeight: 1.7, maxWidth: 480 }}>
                From real estate to cars, jobs to electronics — buy, sell, and connect with thousands of verified sellers across Ethiopia.
              </p>

              {/* Search bar */}
              <div className="hero-h-4 mb-4">
                <HeroSearch />
              </div>

              {/* Category pills */}
              <div className="hero-h-5 d-flex flex-wrap gap-2 mb-5">
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', alignSelf: 'center', marginRight: 4 }}>Browse:</span>
                {HERO_CHIPS.map(c => (
                  <Link key={c.slug} to={`/search?category=${c.slug}`} className="hero-pill">
                    {c.icon} {c.label}
                  </Link>
                ))}
              </div>

              {/* Stats row */}
              <div className="hero-h-5 d-flex gap-3 flex-wrap">
                {[
                  { num: '50K+',  label: 'Active\nListings' },
                  { num: '120K+', label: 'Registered\nUsers' },
                  { num: '13',    label: 'Categories' },
                  { num: '100%',  label: 'Free\nto Start' },
                ].map(s => (
                  <div key={s.num} className="hero-stat">
                    <div className="hero-stat-num">{s.num}</div>
                    <div className="hero-stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── RIGHT: Image ── */}
            <div className="col-lg-6 hero-img-col">
              <div className="hero-img-wrap position-relative" style={{ borderRadius: 24, overflow: 'hidden', height: 560, boxShadow: '0 24px 64px rgba(5,150,105,0.15), 0 8px 24px rgba(0,0,0,0.08)' }}>
                <img
                  src={heroBg}
                  alt="Ethiopia marketplace"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
                />
                {/* Subtle left-fade overlay */}
                <div className="hero-img-overlay" aria-hidden="true" />

                {/* Floating badge — top left */}
                <div className="hero-float-badge" style={{ top: 28, left: 28 }}>
                  <div className="hero-live-dot" />
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>Live Listings</div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Updated in real-time</div>
                  </div>
                </div>

                {/* Floating badge — bottom right */}
                <div className="hero-float-badge hero-float-badge-2" style={{ bottom: 28, right: 28 }}>
                  <span style={{ fontSize: '1.4rem' }}>🔒</span>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>Verified Sellers</div>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Phone-verified accounts</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <CategoriesSection user={user} />

      {/* ── FEATURED LISTINGS ── */}
      <section className="py-5 bg-white">
        <style>{`
          .listing-card {
            transition: all 0.25s ease;
            position: relative;
          }
          .listing-card:hover {
            border-color: #198754 !important;
            box-shadow: 0 10px 28px rgba(25,135,84,0.14) !important;
            transform: translateY(-3px);
          }
          .listing-card .view-overlay {
            position: absolute;
            inset: 0;
            background: rgba(5,150,105,0.82);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.25s ease;
            border-radius: 0.375rem 0.375rem 0 0;
          }
          .listing-card:hover .view-overlay {
            opacity: 1;
          }
          .listing-card .view-overlay span {
            color: #fff;
            font-weight: 700;
            font-size: 0.95rem;
            letter-spacing: 0.04em;
            border: 2px solid #fff;
            padding: 0.4rem 1.2rem;
            border-radius: 50px;
          }
        `}</style>
        <div className="container">

          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h2 className="h4 fw-bold mb-1">{t('home.featuredListings')}</h2>
              <p className="text-muted small mb-0">{t('home.freshPicks')}</p>
            </div>
            <Link to="/search" className="text-success text-decoration-none small fw-semibold">
              {t('home.viewAllListings')}
            </Link>
          </div>

          {loading ? (
            <div className="row g-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-12 col-sm-6 col-lg-4">
                  <div className="card border-0 shadow-sm rounded-3 overflow-hidden placeholder-glow">
                    <div className="placeholder" style={{ height: 180 }} />
                    <div className="card-body">
                      <p className="placeholder col-8 mb-2" />
                      <p className="placeholder col-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: '4rem' }}>🏠</div>
              <p className="text-muted mt-3">{t('home.noListings')}</p>
              {user && user.role !== 'admin' && (
                <button
                  className="btn btn-success rounded-3 px-5 mt-2"
                  onClick={() => setHomePlanModal(true)}
                >
                  {t('home.postListing')}
                </button>
              )}
            </div>
          ) : (
            <div className="row g-4">
              {featured.map((l) => (
                <div key={l._id} className="col-12 col-sm-6 col-lg-4">
                  <Link to={`/listings/${l._id}`} className="text-decoration-none">
                    <div className="listing-card card border rounded-3 overflow-hidden h-100 shadow-sm">

                      {/* Image + hover overlay */}
                      <div className="position-relative overflow-hidden" style={{ height: 190 }}>
                        {l.images?.[0] ? (
                          <img
                            src={l.images[0]}
                            alt={l.title}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                          />
                        ) : (
                          <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light"
                            style={{ fontSize: '3rem' }}>
                            {l.categorySlug === 'automotive' ? '🚗' : l.categorySlug === 'real-estate' ? '🏠' : '🏷️'}
                          </div>
                        )}

                        {/* Hover: View Detail overlay */}
                        <div className="view-overlay">
                          <span>👁 {t('home.viewDetail')}</span>
                        </div>

                        {/* Category badge */}
                        {l.categorySlug && (
                          <span className="position-absolute top-0 start-0 m-2 badge bg-white text-dark fw-normal"
                            style={{ fontSize: '0.68rem' }}>
                            {l.categorySlug.replace(/-/g, ' ')}
                          </span>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="card-body p-3">

                        {/* Title */}
                        <h6 className="fw-semibold text-dark mb-1 text-truncate">{l.title}</h6>

                        {/* Location */}
                        <p className="text-muted small mb-2">
                          📍 {[l.location?.city, l.location?.region].filter(Boolean).join(', ') || 'Ethiopia'}
                        </p>

                        {/* Condition + date instead of price */}
                        <div className="d-flex gap-2 mb-3 flex-wrap">
                          {l.condition && (
                            <span className="badge bg-light text-secondary border" style={{ fontSize: '0.7rem' }}>
                              {l.condition}
                            </span>
                          )}
                          <span className="badge bg-light text-secondary border" style={{ fontSize: '0.7rem' }}>
                            🕒 {new Date(l.createdAt).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                          </span>
                          {l.isFeatured && (
                            <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
                              {t('home.featured')}
                            </span>
                          )}
                        </div>

                        {/* Poster info */}
                        <div className="d-flex align-items-center gap-2 pt-2 border-top">
                          {(() => {
                            // Determine poster: company > owner
                            const isCompany = l.ownerType === 'company' && l.companyOwner;
                            const name    = isCompany ? (l.companyOwner?.companyName || 'Company') : (l.owner?.fullName || 'User');
                            const photo   = isCompany ? l.companyOwner?.logo : l.owner?.profilePhoto;
                            const role    = isCompany ? t('home.company') : (l.owner?.role === 'broker' ? t('home.broker') : t('home.seller'));
                            const initial = (name && name[0]) ? name[0].toUpperCase() : 'U';
                            return (
                              <>
                                {/* Avatar */}
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={name}
                                    className="rounded-circle flex-shrink-0"
                                    style={{ width: 30, height: 30, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle bg-success d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                    style={{ width: 30, height: 30, fontSize: '0.75rem' }}
                                  >
                                    {initial}
                                  </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.78rem' }}>
                                    {name}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                    {role}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── CTA ── */}
      {!user && (
        <section className="py-5 bg-success text-white text-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-7">
                <h2 className="display-6 fw-bolder mb-3">{t('home.readyToMove')}</h2>
                <p className="lead mb-4" style={{ opacity: 0.85 }}>
                  {t('home.joinUsers')}
                </p>
                <Link
                  to="/register"
                  className="btn btn-light btn-lg rounded-3 px-5 fw-bold text-success shadow"
                >
                  {t('home.getStarted')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Home-level plan modal (from empty state button) */}
      {homePlanModal && (
        <PlanSelectionModal
          userRole={user?.role}
          onClose={() => setHomePlanModal(false)}
        />
      )}

    </>
  );
}
