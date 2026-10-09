import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { markRead } from '../store/notificationsSlice';
import client from '../api/client';

const TYPE_ICONS = {
  message:                      '💬',
  listing:                      '🏠',
  listing_expired:              '⏰',
  listing_expiry_warning:       '⚠️',
  subscription_activated:       '✅',
  subscription_expired:         '⏰',
  subscription_expiry_reminder: '🔔',
  subscription_rejected:        '❌',
  subscription_request:         '📋',
  verification_verified:        '✅',
  verification_rejected:        '❌',
  company_pending:              '🏢',
  system:                       '⚙️',
  default:                      '🔔',
};

function getIcon(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.default;
}

// Resolve where a notification should navigate to
function getNotificationLink(n) {
  if (!n.relatedId) return null;
  switch (n.type) {
    case 'message':
      return `/messages/${n.relatedId}`;
    case 'listing':
    case 'listing_expired':
    case 'listing_expiry_warning':
      return `/listings/${n.relatedId}`;
    case 'subscription_activated':
    case 'subscription_expired':
    case 'subscription_expiry_reminder':
    case 'subscription_rejected':
    case 'subscription_request':
      return `/premium-subscription`;
    case 'verification_verified':
    case 'verification_rejected':
      return `/profile`;
    case 'company_pending':
      return `/admin-panel`;
    default:
      return null;
  }
}

export default function NotificationDropdown() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unreadCount } = useSelector((s) => s.notifications);
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const autoReadTimerRef = useRef(null);

  if (!user) return null;

  const recent = items.slice(0, 6);

  // Auto-mark visible unread notifications as read 1.5s after dropdown opens
  useEffect(() => {
    if (!open) return;
    const unread = recent.filter(n => !n.isRead);
    if (unread.length === 0) return;

    autoReadTimerRef.current = setTimeout(() => {
      unread.forEach(n => {
        client.patch(`/notifications/${n._id}/read`).catch(() => {});
        dispatch(markRead(n._id));
      });
    }, 1500);

    return () => clearTimeout(autoReadTimerRef.current);
  }, [open]);

  function handleNotificationClick(n) {
    // Mark as read immediately on click
    if (!n.isRead) {
      client.patch(`/notifications/${n._id}/read`).catch(() => {});
      dispatch(markRead(n._id));
    }
    setOpen(false);
    const link = getNotificationLink(n);
    if (link) navigate(link);
  }

  return (
    <div className="dropdown">
      <button
        className="btn btn-sm btn-outline-secondary position-relative rounded-pill px-3 dropdown-toggle"
        data-bs-toggle="dropdown"
        onClick={() => setOpen(p => !p)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.6rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <div
        className="dropdown-menu dropdown-menu-end shadow"
        style={{ width: 340, maxHeight: 480, overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="dropdown-header d-flex justify-content-between align-items-center py-2">
          <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
            {t('nav.notifications')}
          </span>
          {unreadCount > 0 && (
            <span className="badge bg-danger rounded-pill">{unreadCount}</span>
          )}
        </div>

        <div className="dropdown-divider my-0"></div>

        {/* Notification list */}
        {recent.length === 0 ? (
          <div className="text-center text-muted py-4">
            <div style={{ fontSize: '2rem' }}>🔔</div>
            <small className="d-block mt-1">{t('notifications.noNotificationsYet')}</small>
          </div>
        ) : (
          recent.map((n) => {
            const link = getNotificationLink(n);
            const isClickable = !!link;
            return (
              <div
                key={n._id}
                className={`dropdown-item d-flex align-items-start gap-2 py-2 px-3 ${!n.isRead ? 'bg-primary bg-opacity-10' : ''}`}
                style={{
                  whiteSpace: 'normal',
                  cursor: isClickable ? 'pointer' : 'default',
                  borderLeft: n.type === 'message' && !n.isRead
                    ? '3px solid #0d6efd'
                    : '3px solid transparent',
                }}
                onClick={() => isClickable && handleNotificationClick(n)}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>
                  {getIcon(n.type)}
                </span>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>{n.title}</div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.76rem' }}>{n.body}</div>
                  <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                  {/* Hint for message notifications */}
                  {n.type === 'message' && isClickable && (
                    <div className="text-primary" style={{ fontSize: '0.7rem', marginTop: 2 }}>
                      Open conversation →
                    </div>
                  )}
                </div>
                {!n.isRead && (
                  <span
                    className="rounded-circle bg-primary flex-shrink-0"
                    style={{ width: 8, height: 8, marginTop: 6, display: 'inline-block' }}
                  />
                )}
              </div>
            );
          })
        )}

        {/* Footer */}
        {recent.length > 0 && (
          <>
            <div className="dropdown-divider my-0"></div>
            <div className="text-center py-2">
              <Link
                to="/notifications"
                className="btn btn-sm btn-outline-primary rounded-pill px-4"
                onClick={() => setOpen(false)}
              >
                {t('notifications.allNotifications')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
