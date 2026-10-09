import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setNotifications, markRead } from '../store/notificationsSlice';
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
  default:                      '🔔',
};

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

export default function Notifications() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items } = useSelector((s) => s.notifications);

  useEffect(() => {
    client.get('/notifications')
      .then(({ data }) => {
        if (data.success) {
          dispatch(setNotifications(data.notifications));
          // Auto-mark all unread as read when page opens
          const unread = data.notifications.filter(n => !n.isRead);
          unread.forEach(n => {
            client.patch(`/notifications/${n._id}/read`).catch(() => {});
            dispatch(markRead(n._id));
          });
        }
      })
      .catch(() => {});
  }, [dispatch]);

  function handleClick(n) {
    const link = getNotificationLink(n);
    if (link) navigate(link);
  }

  return (
    <div className="container py-4" style={{ maxWidth: 700 }}>
      <h4 className="fw-bold mb-4">{t('nav.notifications')}</h4>

      {items.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '3rem' }}>🔔</div>
          <p className="mt-3">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.map((n) => {
            const link = getNotificationLink(n);
            const isClickable = !!link;
            return (
              <div
                key={n._id}
                className={`border rounded-3 p-3 d-flex align-items-start gap-3 ${!n.isRead ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  borderLeft: n.type === 'message' && !n.isRead
                    ? '4px solid #0d6efd'
                    : undefined,
                  transition: 'box-shadow 0.15s',
                }}
                onClick={() => isClickable && handleClick(n)}
                onMouseEnter={e => { if (isClickable) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
              >
                <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 2 }}>
                  {TYPE_ICONS[n.type] || TYPE_ICONS.default}
                </span>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{n.title}</div>
                  <div className="small text-muted mt-1">{n.body}</div>
                  <div className="small text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  {n.type === 'message' && isClickable && (
                    <div className="text-primary small mt-1">Open conversation →</div>
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
          })}
        </div>
      )}
    </div>
  );
}
