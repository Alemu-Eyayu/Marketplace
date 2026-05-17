import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Minimal menu section for the navbar.
 * Shows role-appropriate quick links in a dropdown.
 */
export default function MenuSection({ user, unreadCounts = {}, className = '' }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!user) return null;

  const menuItems = getMenuItems(user.role);

  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, v) => sum + (typeof v === 'number' ? v : 0),
    0,
  );

  return (
    <div className={`menu-section ${className}`} data-testid="menu-section">
      <div className="dropdown">
        <button
          className="btn btn-sm btn-outline-secondary rounded-pill px-3 dropdown-toggle d-flex align-items-center gap-2"
          data-bs-toggle="dropdown"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          data-testid="menu-dropdown-toggle"
        >
          <span>📋</span>
          <span>{t('navigation.menu', 'Menu')}</span>
          {totalUnread > 0 && (
            <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.6rem' }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>

        <ul className="dropdown-menu" data-testid="menu-dropdown-menu">
          {menuItems.map((item) => (
            <li key={item.key}>
              <Link
                className={`dropdown-item d-flex align-items-center justify-content-between ${
                  location.pathname === item.path ? 'active' : ''
                }`}
                to={item.path}
                onClick={() => setDropdownOpen(false)}
                data-testid={`menu-item-${item.key}`}
              >
                <div className="d-flex align-items-center gap-2">
                  <span>{item.icon}</span>
                  <span>{t(`navigation.${item.key}`, item.label)}</span>
                </div>
                {item.key === 'messages' && unreadCounts.messages > 0 && (
                  <span className="badge bg-primary rounded-pill">{unreadCounts.messages}</span>
                )}
              </Link>
            </li>
          ))}
          {menuItems.length === 0 && (
            <li>
              <span className="dropdown-item-text text-muted">
                {t('navigation.noMenuItems', 'No menu items available')}
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function getMenuItems(role) {
  const base = [
    { key: 'messages',   label: 'Messages',   icon: '💬', path: '/messages' },
    { key: 'my-listings', label: 'My Listings', icon: '📋', path: '/my-listings' },
  ];
  const extra = {
    admin:   [{ key: 'admin-panel', label: 'Admin Panel', icon: '⚙️', path: '/admin-panel' }],
    broker:  [],
    company: [],
    user:    [],
  };
  return [...base, ...(extra[role] || [])];
}
