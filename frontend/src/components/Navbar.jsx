import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth } from '../store/authSlice';
import { clearNotifications } from '../store/notificationsSlice';
import client from '../api/client';
import { ProfileSection } from './navbar/index.js';
import NotificationDropdown from './NotificationDropdown';
import PlanSelectionModal from './PlanSelectionModal';

const ALL_CATEGORIES = [
  { value: 'real-estate',         label: '🏠 Real Estate' },
  { value: 'automotive',          label: '🚗 Automotive' },
  { value: 'electronics',         label: '📱 Electronics' },
  { value: 'home-furniture',      label: '🛋️ Home & Furniture' },
  { value: 'fashion-clothing',    label: '👕 Fashion & Clothing' },
  { value: 'sports-fitness',      label: '⚽ Sports & Fitness' },
  { value: 'books-media',         label: '📚 Books & Media' },
  { value: 'pets-animals',        label: '🐾 Pets & Animals' },
  { value: 'services',            label: '🔧 Services' },
  { value: 'domestic-jobs',       label: '🏡 Domestic Jobs' },
  { value: 'professional-jobs',   label: '💼 Professional Jobs' },
  { value: 'business-industrial', label: '🏭 Business & Industrial' },
  { value: 'agriculture',         label: '🌾 Agriculture' },
];

export default function Navbar() {
  const { i18n, t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const searchRef = useRef(null);
  const [postModal, setPostModal] = useState(false);

  // Close search panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    try { 
      await client.post('/auth/logout'); 
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('refreshToken');
    dispatch(clearNotifications());
    dispatch(clearAuth());
    navigate('/');
  }

  function handleEditProfile() {
    navigate('/profile');
  }

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (region) params.set('region', region);
    setSearchOpen(false);
    navigate(`/search?${params.toString()}`);
  }

  async function handleLanguageToggle() {
    const newLang = i18n.language === 'en' ? 'am' : 'en';
    await i18n.changeLanguage(newLang);
    if (user) {
      try {
        await client.patch('/users/me/language', { language: newLang });
      } catch {
        // silent fail
      }
    }
  }

  return (
    <>
      <nav className="navbar-custom">
        <div className="container d-flex align-items-center justify-content-between" style={{ height: 67.2 }}>

          {/* ── LEFT: Brand ── */}
          <Link to="/" className="navbar-brand d-flex align-items-center gap-2" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem' }}>🏠</span>
            <span>EthioGebiya</span>
          </Link>

          {/* ── MIDDLE: Search trigger ── */}
          <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 480, margin: '0 24px' }}>
            <button
              className="search-trigger"
              onClick={() => setSearchOpen((o) => !o)}
            >
              <span className="search-trigger-icon">🔍</span>
              <span className="search-trigger-text">{t('nav.search')}</span>
            </button>

            {/* Expanded search panel */}
            {searchOpen && (
              <div className="search-panel">
                <form onSubmit={handleSearch}>
                  <div className="search-panel-main">
                    <input
                      autoFocus
                      className="search-panel-input"
                      placeholder={t('search.keywordPlaceholder')}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  <div className="search-panel-filters" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">{t('search.allCategoriesOption')}</option>
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      placeholder={t('search.regionPlaceholder')}
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="search-panel-btn" style={{ flex: 1 }}>
                      🔍 {t('search.searchBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQ(''); setCategory(''); setRegion(''); }}
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
            )}
          </div>

          {/* ── POST LISTING button (non-admin logged-in users only) ── */}
          {user && user.role !== 'admin' && (
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              <Link
                to="/my-listings"
                className="btn btn-sm btn-outline-success rounded-pill px-3 fw-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                <i className="bi bi-grid me-1"></i>My Listings
              </Link>
              <button
                className="btn btn-success btn-sm fw-semibold rounded-pill px-3"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => setPostModal(true)}
              >
                + Post
              </button>
            </div>
          )}

          {/* ── RIGHT: Auth / User ── */}
          <div className="d-flex align-items-center gap-2">
            {user ? (
              <>
                <NotificationDropdown />
                {/* Admin gets Dashboard button directly on navbar */}
                {user.role === 'admin' && (
                  <Link to="/admin-panel" className="btn btn-sm btn-outline-danger rounded-pill px-3">
                    ⚙️ Admin
                  </Link>
                )}
                <ProfileSection user={user} onEditProfile={handleEditProfile} />

                {/* 3-Dot Menu for Language and Logout */}
                <div className="dropdown">
                  <button
                    className="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center dropdown-toggle"
                    data-bs-toggle="dropdown"
                    style={{ width: '36px', height: '36px', border: 'none' }}
                    title="More options"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button
                        className="dropdown-item d-flex align-items-center gap-2"
                        onClick={handleLanguageToggle}
                      >
                        🌐 {i18n.language === 'en' ? 'አማርኛ' : 'English'}
                      </button>
                    </li>
                    {user.role !== 'admin' && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <Link className="dropdown-item d-flex align-items-center gap-2" to="/settings">
                            ⚙️ Settings
                          </Link>
                        </li>
                      </>
                    )}
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button
                        className="dropdown-item d-flex align-items-center gap-2 text-danger"
                        onClick={handleLogout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16,17 21,12 16,7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        {t('nav.logout')}
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <button
                  className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                  onClick={handleLanguageToggle}
                >
                  {i18n.language === 'en' ? 'አማ' : 'EN'}
                </button>
                <div className="dropdown">
                  <button className="btn btn-sm btn-primary rounded-pill px-4 dropdown-toggle" data-bs-toggle="dropdown">
                    {t('nav.account')}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><Link className="dropdown-item fw-semibold" to="/login">🔑 {t('nav.login')}</Link></li>
                    <li><Link className="dropdown-item" to="/register">✨ {t('nav.register')}</Link></li>
                  </ul>
                </div>
              </>
            )}
          </div>

        </div>
      </nav>

      {/* Plan Selection Modal — triggered by Post button */}
      {postModal && (
        <PlanSelectionModal
          userRole={user?.role}
          onClose={() => setPostModal(false)}
        />
      )}
    </>
  );
}
