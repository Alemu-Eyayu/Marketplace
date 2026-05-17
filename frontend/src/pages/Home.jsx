import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import PlanSelectionModal from '../components/PlanSelectionModal';

const CATEGORIES = [
  { slug: 'real-estate',         label: 'Real Estate',   icon: '🏠' },
  { slug: 'automotive',          label: 'Automotive',    icon: '🚗' },
  { slug: 'electronics',         label: 'Electronics',   icon: '📱' },
  { slug: 'home-furniture',      label: 'Furniture',     icon: '🛋️' },
  { slug: 'fashion-clothing',    label: 'Fashion',       icon: '👕' },
  { slug: 'sports-fitness',      label: 'Sports',        icon: '⚽' },
  { slug: 'books-media',         label: 'Books & Media', icon: '📚' },
  { slug: 'pets-animals',        label: 'Pets',          icon: '🐾' },
  { slug: 'services',            label: 'Services',      icon: '🔧' },
  { slug: 'domestic-jobs',       label: 'Domestic Jobs', icon: '🏡' },
  { slug: 'professional-jobs',   label: 'Pro Jobs',      icon: '💼' },
  { slug: 'business-industrial', label: 'Business',      icon: '🏭' },
  { slug: 'agriculture',         label: 'Agriculture',   icon: '🌾' },
];

function CategoriesSection({ user }) {
  const [expanded, setExpanded] = useState(false);
  const [planModal, setPlanModal] = useState(null); // { categorySlug }
  const { t } = useTranslation();
  const navigate = useNavigate();

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
            {CATEGORIES.map((cat, idx) => (
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
            {CATEGORIES.map((cat, idx) => (
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
      <section className="border-bottom bg-white text-center position-relative" style={{ padding: '1.5rem 0' }}>
        <style>{`
          @keyframes gradientShift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .hero-gradient-text {
            background: linear-gradient(270deg, #059669, #10b981, #34d399, #0d9488, #059669);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: gradientShift 3s ease infinite;
          }
          @keyframes pulse-ring {
            0%   { box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
            70%  { box-shadow: 0 0 0 8px rgba(5,150,105,0); }
            100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-4px); }
          }
          .about-btn {
            animation: pulse-ring 2s ease-out infinite, float 3s ease-in-out infinite;
            transition: background 0.2s, color 0.2s;
          }
          .about-btn:hover {
            background: #059669 !important;
            color: #fff !important;
            border-color: #059669 !important;
          }
        `}</style>

        <div className="container py-2">
          <h1 className="fw-bolder mb-0" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)' }}>
            <span className="hero-gradient-text">{t('home.welcomeTitle')}</span>
          </h1>
        </div>

        {/* About Us button — bottom right */}
        <div className="position-absolute" style={{ bottom: '1rem', right: '1.5rem' }}>
          <Link
            to="/how-it-works"
            className="about-btn btn btn-outline-success btn-sm rounded-pill px-3 fw-semibold"
            style={{ fontSize: '0.78rem', letterSpacing: '0.03em' }}
          >
            {t('home.aboutUs')}
          </Link>
        </div>

      </section>

      {/* ── CATEGORIES ── */}
      <CategoriesSection />

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
