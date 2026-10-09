import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import PlanSelectionModal from '../components/PlanSelectionModal';

const CATEGORIES = [
  { value: 'real-estate',         label: 'Real Estate' },
  { value: 'automotive',          label: 'Automotive' },
  { value: 'electronics',         label: 'Electronics' },
  { value: 'home-furniture',      label: 'Home & Furniture' },
  { value: 'fashion-clothing',    label: 'Fashion & Clothing' },
  { value: 'sports-fitness',      label: 'Sports & Fitness' },
  { value: 'books-media',         label: 'Books & Media' },
  { value: 'pets-animals',        label: 'Pets & Animals' },
  { value: 'services',            label: 'Services' },
  { value: 'domestic-jobs',       label: 'Domestic Jobs' },
  { value: 'professional-jobs',   label: 'Professional Jobs' },
  { value: 'business-industrial', label: 'Business & Industrial' },
  { value: 'agriculture',         label: 'Agriculture' },
];

const CATEGORY_ICONS = {
  'real-estate': '🏠', automotive: '🚗', electronics: '📱',
  'home-furniture': '🛋️', 'fashion-clothing': '👕', 'sports-fitness': '⚽',
  'books-media': '📚', 'pets-animals': '🐾', services: '🔧',
  'domestic-jobs': '🏡', 'professional-jobs': '💼', 'business-industrial': '🏭', agriculture: '🌾',
};

// Sub-category options per category slug
const SUB_CATEGORIES = {
  'real-estate': [
    { value: 'apartment',   label: 'Apartment' },
    { value: 'house',       label: 'House' },
    { value: 'villa',       label: 'Villa' },
    { value: 'land',        label: 'Land' },
    { value: 'commercial',  label: 'Commercial' },
    { value: 'office',      label: 'Office' },
  ],
  automotive: [
    { value: 'car',         label: 'Car' },
    { value: 'suv',         label: 'SUV' },
    { value: 'truck',       label: 'Truck' },
    { value: 'motorcycle',  label: 'Motorcycle' },
    { value: 'bus',         label: 'Bus' },
    { value: 'van',         label: 'Van' },
  ],
  electronics: [
    { value: 'mobile-phones', label: 'Mobile Phones' },
    { value: 'laptops',       label: 'Laptops' },
    { value: 'tablets',       label: 'Tablets' },
    { value: 'cameras',       label: 'Cameras' },
    { value: 'tv-audio',      label: 'TV & Audio' },
    { value: 'gaming',        label: 'Gaming' },
    { value: 'accessories',   label: 'Accessories' },
  ],
  'home-furniture': [
    { value: 'furniture',   label: 'Furniture' },
    { value: 'appliances',  label: 'Appliances' },
    { value: 'decor',       label: 'Decor' },
    { value: 'kitchen',     label: 'Kitchen' },
    { value: 'garden',      label: 'Garden' },
  ],
  'fashion-clothing': [
    { value: 'mens-clothing',   label: "Men's Clothing" },
    { value: 'womens-clothing', label: "Women's Clothing" },
    { value: 'kids-clothing',   label: "Kids' Clothing" },
    { value: 'shoes',           label: 'Shoes' },
    { value: 'bags',            label: 'Bags' },
    { value: 'accessories',     label: 'Accessories' },
    { value: 'jewelry',         label: 'Jewelry' },
  ],
  'sports-fitness': [
    { value: 'gym-equipment',       label: 'Gym Equipment' },
    { value: 'outdoor-sports',      label: 'Outdoor Sports' },
    { value: 'team-sports',         label: 'Team Sports' },
    { value: 'cycling',             label: 'Cycling' },
    { value: 'fitness-accessories', label: 'Fitness Accessories' },
  ],
  'books-media': [
    { value: 'books',     label: 'Books' },
    { value: 'magazines', label: 'Magazines' },
    { value: 'music',     label: 'Music' },
    { value: 'movies',    label: 'Movies' },
    { value: 'games',     label: 'Games' },
  ],
  'pets-animals': [
    { value: 'dogs',           label: 'Dogs' },
    { value: 'cats',           label: 'Cats' },
    { value: 'birds',          label: 'Birds' },
    { value: 'fish',           label: 'Fish' },
    { value: 'pet-accessories', label: 'Pet Accessories' },
    { value: 'pet-food',       label: 'Pet Food' },
  ],
  services: [
    { value: 'home-services',         label: 'Home Services' },
    { value: 'professional-services', label: 'Professional Services' },
    { value: 'events',                label: 'Events' },
    { value: 'education',             label: 'Education' },
    { value: 'health-beauty',         label: 'Health & Beauty' },
    { value: 'automotive-services',   label: 'Automotive Services' },
  ],
  'domestic-jobs': [
    { value: 'housekeeper',   label: 'Housekeeper / Cleaner' },
    { value: 'guard',         label: 'Guard / Security' },
    { value: 'driver',        label: 'Driver' },
    { value: 'nanny',         label: 'Nanny / Childcare' },
    { value: 'gardener',      label: 'Gardener' },
    { value: 'cook',          label: 'Cook' },
    { value: 'general-labor', label: 'General Labor' },
  ],
  'professional-jobs': [
    { value: 'technology',     label: 'Technology & IT' },
    { value: 'healthcare',     label: 'Healthcare & Medical' },
    { value: 'finance',        label: 'Finance & Banking' },
    { value: 'education',      label: 'Education & Training' },
    { value: 'engineering',    label: 'Engineering & Construction' },
    { value: 'sales-marketing', label: 'Sales & Marketing' },
    { value: 'legal',          label: 'Legal & Compliance' },
    { value: 'logistics',      label: 'Logistics & Supply Chain' },
    { value: 'hospitality',    label: 'Hospitality & Tourism' },
    { value: 'ngo',            label: 'NGO & Development' },
  ],
  'business-industrial': [
    { value: 'machinery',         label: 'Machinery' },
    { value: 'equipment',         label: 'Equipment' },
    { value: 'supplies',          label: 'Supplies' },
    { value: 'business-for-sale', label: 'Business for Sale' },
  ],
  agriculture: [
    { value: 'crops',       label: 'Crops' },
    { value: 'livestock',   label: 'Livestock' },
    { value: 'equipment',   label: 'Equipment' },
    { value: 'seeds',       label: 'Seeds' },
    { value: 'fertilizers', label: 'Fertilizers' },
  ],
};

export default function Search() {
  const user = useSelector((s) => s.auth.user);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = useCallback(() => ({
    q:           searchParams.get('q')           || '',
    category:    searchParams.get('category')    || '',
    subCategory: searchParams.get('subCategory') || '',
    region:      searchParams.get('region')      || '',
    city:        searchParams.get('city')        || '',
  }), [searchParams]);

  const [filters, setFilters] = useState(filtersFromUrl);
  const [results, setResults]     = useState([]);
  const [related, setRelated]     = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    const fresh = filtersFromUrl();
    setFilters(fresh);
    doSearch(1, fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  async function doSearch(page = 1, overrideFilters) {
    setLoading(true);
    setSaved(false);
    const active = overrideFilters || filters;
    try {
      const params = { ...active, page };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await client.get('/search', { params });
      setResults(data.listings || []);
      setRelated(data.related  || []);
      setPagination(data.pagination);
      setSearchParams(params, { replace: true });
    } catch (_) {
      setResults([]);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doSearch(1);
  }

  async function handleSaveSearch() {
    try {
      await client.post('/search/saved', filters);
      setSaved(true);
    } catch (_) {}
  }

  function clearCategory() {
    const next = { q: '', category: '', subCategory: '', region: '', city: '' };
    setFilters(next);
    doSearch(1, next);
  }

  function clearCategoryFilters() {
    const next = { ...filters, subCategory: '', region: '', city: '' };
    setFilters(next);
    doSearch(1, next);
  }

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);
  const subCategoryOptions = activeCategory ? (SUB_CATEGORIES[activeCategory.value] || []) : [];
  const canCreateListing = user && user.role !== 'admin';

  // Plan modal state
  const [planModal, setPlanModal] = useState(null); // { categorySlug }

  // Check if any category-scoped filter is active
  const hasActiveFilters = filters.subCategory || filters.region || filters.city;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Category-scoped filter bar ── */}
      {activeCategory ? (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
          <div className="container">

            {/* Row 1: breadcrumb + create button */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem',
                    padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <i className="bi bi-arrow-left"></i> {t('search.allCategoriesBack')}
                </button>
                <span style={{ color: '#d1d5db' }}>|</span>
                {/* Locked category badge */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  borderRadius: 20, padding: '4px 12px',
                  fontWeight: 700, fontSize: '0.88rem',
                }}>
                  {CATEGORY_ICONS[activeCategory.value]} {activeCategory.label}
                </span>
              </div>

              {canCreateListing && (
                <button
                  className="btn btn-success btn-sm fw-semibold px-3"
                  style={{ borderRadius: 8, whiteSpace: 'nowrap' }}
                  onClick={() => setPlanModal({ categorySlug: activeCategory.value })}
                >
                  <i className="bi bi-plus-lg me-1"></i>{t('search.createListing')}
                </button>
              )}
            </div>

            {/* Row 2: filter fields */}
            <form onSubmit={handleSubmit}>
              <div className="d-flex gap-2 flex-wrap align-items-center">

                {/* Sub-category dropdown */}
                {subCategoryOptions.length > 0 && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: 160, borderColor: '#d1d5db' }}
                    value={filters.subCategory}
                    onChange={(e) => setFilters((f) => ({ ...f, subCategory: e.target.value }))}
                  >
                  <option value="">All {activeCategory.label}</option>
                    {subCategoryOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                )}

                {/* Region */}
                <input
                  className="form-control form-control-sm"
                  style={{ width: 'auto', minWidth: 150, borderColor: '#d1d5db' }}
                  placeholder={t('search.regionPlaceholder')}
                  value={filters.region}
                  onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                />

                {/* City */}
                <input
                  className="form-control form-control-sm"
                  style={{ width: 'auto', minWidth: 130, borderColor: '#d1d5db' }}
                  placeholder={t('search.cityPlaceholder')}
                  value={filters.city}
                  onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                />

                {/* Search button */}
                <button type="submit" className="btn btn-primary btn-sm fw-semibold px-4">
                  <i className="bi bi-search me-1"></i>{t('search.searchBtn')}
                </button>

                {/* Clear filters (only when something is active) */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearCategoryFilters}
                  >
                    <i className="bi bi-x me-1"></i>{t('search.clearBtn')}
                  </button>
                )}

                {/* Save search */}
                {user && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary ms-auto"
                    onClick={handleSaveSearch}
                    title="Save this search"
                  >
                    <i className={`bi ${saved ? 'bi-bookmark-fill text-primary' : 'bi-bookmark'}`}></i>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ── General search bar (no category selected) ── */
        <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
          <div className="container">
            <form onSubmit={handleSubmit}>
              <div className="search-panel-main mb-2">
                <input
                  className="search-panel-input"
                  placeholder={t('search.keywordPlaceholder')}
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-panel-filters" style={{ gridTemplateColumns: '1fr 1fr', flex: 1, minWidth: 0 }}>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">{t('search.allCategoriesOption')}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {CATEGORY_ICONS[c.value]} {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder={t('search.regionPlaceholder')}
                    value={filters.region}
                    onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                  />
                </div>
                <button type="submit" className="search-panel-btn" style={{ width: 'auto', padding: '10px 28px' }}>
                  {t('search.searchIcon')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleared = { q: '', category: '', subCategory: '', region: '', city: '' };
                    setFilters(cleared);
                    doSearch(1, cleared);
                  }}
                  style={{
                    background: 'none', border: '1.5px solid var(--border)',
                    borderRadius: 10, padding: '10px 16px',
                    fontSize: '0.85rem', fontWeight: 600,
                    color: 'var(--text-muted)', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('search.clearBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="container py-4">

        {/* Active filter pills */}
        {activeCategory && hasActiveFilters && (
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
            {filters.subCategory && (
              <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {subCategoryOptions.find(s => s.value === filters.subCategory)?.label || filters.subCategory}
                <button onClick={() => { const n = { ...filters, subCategory: '' }; setFilters(n); doSearch(1, n); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', lineHeight: 1 }}>✕</button>
              </span>
            )}
            {filters.region && (
              <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                📍 {filters.region}
                <button onClick={() => { const n = { ...filters, region: '' }; setFilters(n); doSearch(1, n); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', lineHeight: 1 }}>✕</button>
              </span>
            )}
            {filters.city && (
              <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                🏙️ {filters.city}
                <button onClick={() => { const n = { ...filters, city: '' }; setFilters(n); doSearch(1, n); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', lineHeight: 1 }}>✕</button>
              </span>
            )}
          </div>
        )}

        {/* Result count */}
        {!loading && pagination && (
          <p className="text-muted small mb-3">
            {pagination.total} listing{pagination.total !== 1 ? 's' : ''} found
            {activeCategory ? ` in ${activeCategory.label}` : ''}
            {filters.subCategory && ` › ${subCategoryOptions.find(s => s.value === filters.subCategory)?.label || filters.subCategory}`}
            {(filters.region || filters.city) && ` · ${[filters.city, filters.region].filter(Boolean).join(', ')}`}
          </p>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="row g-3">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="col-md-4 col-sm-6">
                <div className="listing-card">
                  <div style={{ height: 200, background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  <div className="p-3">
                    <div style={{ height: 14, borderRadius: 6, background: '#e5e7eb', marginBottom: 8, width: '40%' }} />
                    <div style={{ height: 18, borderRadius: 6, background: '#e5e7eb', marginBottom: 6 }} />
                    <div style={{ height: 13, borderRadius: 6, background: '#e5e7eb', width: '60%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && (
          <div className="text-center py-5">
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>
              {activeCategory ? CATEGORY_ICONS[activeCategory.value] : '🔍'}
            </div>
            <h5 className="text-muted">
              {activeCategory ? t('search.noListingsInCategory', { category: activeCategory.label }) : t('search.noListingsGeneral')}
            </h5>
            <p className="text-muted small mb-3">
              {hasActiveFilters ? t('search.tryRemovingFilters') : activeCategory ? t('search.beFirstToPost') : t('search.tryDifferentKeywords')}
            </p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              {hasActiveFilters && (
                <button className="btn btn-outline-secondary rounded-pill px-4" onClick={clearCategoryFilters}>
                  {t('search.clearFilters')}
                </button>
              )}
              {canCreateListing && activeCategory && (
                <button
                  className="btn btn-primary rounded-pill px-4"
                  onClick={() => setPlanModal({ categorySlug: activeCategory.value })}
                >
                  <i className="bi bi-plus-circle me-2"></i>{t('search.postIn', { category: activeCategory.label })}
                </button>
              )}
              {!activeCategory && (
                <button className="btn btn-outline-secondary rounded-pill px-4" onClick={clearCategory}>
                  {t('search.clearAllFilters')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div className="row g-3">
            {results.map((l) => (
              <div key={l._id} className="col-md-4 col-sm-6">
                <Link to={`/listings/${l._id}`} className="text-decoration-none d-block h-100">
                  <div className="listing-card h-100">
                    <div className="position-relative">
                      {l.images?.[0] ? (
                        <img src={l.images[0]} alt={l.title} className="listing-card-img" />
                      ) : (
                        <div className="listing-card-img-placeholder">
                          {CATEGORY_ICONS[l.categorySlug] || '🏷️'}
                        </div>
                      )}
                      {l.isFeatured && <span className="listing-badge">⭐ Featured</span>}
                      {l.images?.length > 1 && (
                        <span style={{
                          position: 'absolute', bottom: 10, right: 10,
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          borderRadius: 20, padding: '3px 10px',
                          fontSize: '0.72rem', fontWeight: 600,
                          backdropFilter: 'blur(4px)',
                        }}>
                          <i className="bi bi-images me-1"></i>{l.images.length}
                        </span>
                      )}
                    </div>
                    <div className="p-3 d-flex flex-column" style={{ flex: 1 }}>
                      <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>
                        {l.price?.toLocaleString()} <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{l.currency || 'ETB'}</span>
                      </p>
                      <h6 className="text-truncate" style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, lineHeight: 1.35 }}>
                        {l.title}
                      </h6>
                      <div className="d-flex align-items-center justify-content-between mt-auto">
                        <span className="text-muted small">
                          <i className="bi bi-geo-alt-fill me-1" style={{ color: 'var(--primary)' }}></i>
                          {[l.location?.city, l.location?.region].filter(Boolean).join(', ') || 'Ethiopia'}
                        </span>
                        {l.categorySlug && !activeCategory && (
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            borderRadius: 20, padding: '2px 8px', flexShrink: 0,
                          }}>
                            {l.categorySlug.replace(/-/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="d-flex gap-2 mt-4 flex-wrap">
            <button className="btn btn-sm btn-outline-primary" disabled={pagination.page <= 1} onClick={() => doSearch(pagination.page - 1)}>{t('search.prevPage')}</button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => doSearch(p)}>{p}</button>
            ))}
            <button className="btn btn-sm btn-outline-primary" disabled={pagination.page >= pagination.pages} onClick={() => doSearch(pagination.page + 1)}>{t('search.nextPage')}</button>
          </div>
        )}

        {/* Related listings */}
        {related.length > 0 && (
          <div className="mt-5">
            <h5 className="fw-bold mb-3">{t('search.youMightAlsoLike')}</h5>
            <div className="row g-3">
              {related.map((l) => (
                <div key={l._id} className="col-md-3 col-sm-6">
                  <Link to={`/listings/${l._id}`} className="text-decoration-none d-block">
                    <div className="listing-card">
                      <div className="position-relative">
                        {l.images?.[0] ? (
                          <img src={l.images[0]} alt={l.title} style={{ height: 140, width: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: 140, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                            {CATEGORY_ICONS[l.categorySlug] || '🏷️'}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 2 }}>
                          {l.price?.toLocaleString()} <span style={{ fontSize: '0.75rem' }}>{l.currency || 'ETB'}</span>
                        </p>
                        <p className="text-truncate mb-0" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{l.title}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
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

    </div>
  );
}
