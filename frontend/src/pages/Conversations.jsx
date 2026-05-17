import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setConversations } from '../store/messagesSlice';
import client from '../api/client';

export default function Conversations() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const conversations = useSelector((s) => s.messages.conversations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const { data } = await client.get('/conversations');
        if (data.success) {
          dispatch(setConversations(data.conversations || []));
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2>{t('nav.messages')}</h2>
      {conversations.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted">{t('messages.noConversations')}</p>
          <p className="small text-muted">{t('messages.startConversation')}</p>
        </div>
      )}
      <div className="list-group">
        {conversations.map((c) => (
          <Link key={c._id} to={`/messages/${c._id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{c.listing?.title || t('messages.conversation')}</strong>
                  {c.lastMessage && (
                    <div className="mb-0 text-muted small">
                      {c.lastMessage.sender && (
                        <span className="fw-semibold">{c.lastMessage.sender.fullName}: </span>
                      )}
                      {c.lastMessage.body || t('messages.attachment_label')}
                    </div>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2">
                  {c.unreadCount > 0 && (
                    <span className="badge bg-primary rounded-pill">{c.unreadCount}</span>
                  )}
                  <small className="text-muted">
                    {c.updatedAt && new Date(c.updatedAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
