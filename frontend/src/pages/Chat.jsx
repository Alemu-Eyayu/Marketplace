import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { setMessages, appendMessage, setConversations } from '../store/messagesSlice';
import client from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function Avatar({ name, photo, size = 32, color = '#6c757d' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="rounded-circle flex-shrink-0"
        style={{ width: size, height: size, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: color, flexShrink: 0 }}
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

export default function Chat() {
  const { t } = useTranslation();
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.messages.messages);
  const accessToken = useSelector((s) => s.auth.accessToken);
  const user = useSelector((s) => s.auth.user);

  const [body, setBody]               = useState('');
  const [attachment, setAttachment]   = useState(null);
  const [typing, setTyping]           = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const socketRef       = useRef(null);
  const bottomRef       = useRef(null);
  const typingTimeout   = useRef(null);
  const fileInputRef    = useRef(null);

  useEffect(() => {
    if (!conversationId || !accessToken) return;

    const loadMessages = async () => {
      try {
        const { data } = await client.get(`/conversations/${conversationId}/messages`);
        if (data.success) {
          dispatch(setMessages(data.messages || []));
          client.get('/conversations')
            .then(({ data: c }) => { if (c.success) dispatch(setConversations(c.conversations)); })
            .catch(() => {});
        }
      } catch (err) {
        setError(err.response?.data?.message || t('messages.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('conversation:join', conversationId));
    socket.on('connect_error', () => setError(t('messages.failedToConnect')));
    socket.on('message:receive', (msg) => dispatch(appendMessage(msg)));
    socket.on('conversation:typing', ({ isTyping }) => setRemoteTyping(isTyping));

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.disconnect();
      clearTimeout(typingTimeout.current);
    };
  }, [conversationId, accessToken, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleTyping(e) {
    setBody(e.target.value);
    if (!typing && socketRef.current) {
      setTyping(true);
      socketRef.current.emit('conversation:typing', { conversationId, isTyping: true });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('conversation:typing', { conversationId, isTyping: false });
    }, 2000);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim() && !attachment) return;
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      if (body.trim()) fd.append('body', body.trim());
      if (attachment) fd.append('attachment', attachment);
      const { data } = await client.post(`/conversations/${conversationId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        dispatch(appendMessage(data.message));
        setBody('');
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || t('messages.failedToSend'));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div
      className="d-flex flex-column"
      style={{ height: 'calc(100vh - 70px)', maxWidth: 760, margin: '0 auto', padding: '0 12px' }}
    >
      {/* Top bar */}
      <div className="d-flex align-items-center gap-2 py-2 border-bottom mb-1">
        <button
          className="btn btn-link text-secondary p-0 me-1"
          onClick={() => navigate('/messages')}
          style={{ fontSize: '1.1rem' }}
        >
          ←
        </button>
        <span className="fw-semibold">{t('messages.conversation')}</span>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible py-2 mb-1" style={{ fontSize: '0.85rem' }}>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Message list */}
      <div
        className="flex-grow-1 overflow-auto py-3"
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted my-auto">
            <div style={{ fontSize: '2.5rem' }}>💬</div>
            <p className="mt-2 small">{t('messages.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender === user?._id || msg.sender?._id === user?._id;
            const senderName = msg.sender?.fullName || '';
            const senderPhoto = msg.sender?.photo || msg.sender?.profilePhoto;

            return (
              <div
                key={msg._id}
                className={`d-flex align-items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ marginBottom: 6 }}
              >
                {/* Avatar */}
                <Avatar
                  name={isMine ? user?.fullName : senderName}
                  photo={isMine ? (user?.photo || user?.profilePhoto) : senderPhoto}
                  size={30}
                  color={isMine ? '#0d6efd' : '#6c757d'}
                />

                {/* Bubble — inline-block so it only takes as much width as content */}
                <div style={{ maxWidth: '65%', display: 'inline-block' }}>
                  {/* Sender name for received messages */}
                  {!isMine && senderName && (
                    <div className="text-muted mb-1" style={{ fontSize: '0.72rem', paddingLeft: 4 }}>
                      {senderName}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMine ? '#0d6efd' : '#f0f0f0',
                      color: isMine ? '#fff' : '#212529',
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                    }}
                  >
                    {msg.body && (
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.body}</div>
                    )}
                    {msg.attachment && (
                      <div style={{ marginTop: msg.body ? 6 : 0 }}>
                        <a
                          href={msg.attachment}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: isMine ? '#cfe2ff' : '#0d6efd', fontSize: '0.82rem' }}
                        >
                          📎 {t('messages.attachment')}
                        </a>
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '0.65rem',
                        marginTop: 4,
                        textAlign: 'right',
                        opacity: 0.7,
                        color: isMine ? '#e0ecff' : '#888',
                      }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {remoteTyping && (
          <div className="d-flex align-items-end gap-2">
            <div
              style={{
                padding: '8px 14px',
                borderRadius: '18px 18px 18px 4px',
                background: '#f0f0f0',
                display: 'inline-block',
              }}
            >
              <span className="text-muted fst-italic" style={{ fontSize: '0.82rem' }}>
                {t('messages.typing')}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div className="d-flex align-items-center gap-2 px-2 py-1 mb-1 bg-light rounded-3" style={{ fontSize: '0.8rem' }}>
          <span>📎 {attachment.name}</span>
          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-0 ms-auto"
            onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="d-flex gap-2 py-2 border-top"
        style={{ flexShrink: 0 }}
      >
        <input
          className="form-control rounded-pill"
          placeholder={t('messages.typeMessage')}
          value={body}
          onChange={handleTyping}
          disabled={sending}
          style={{ fontSize: '0.9rem' }}
        />
        <label
          className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 38, height: 38, padding: 0, cursor: 'pointer' }}
          title={t('messages.attachment')}
        >
          📎
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => setAttachment(e.target.files[0])}
            disabled={sending}
          />
        </label>
        <button
          className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          type="submit"
          disabled={sending || (!body.trim() && !attachment)}
          style={{ width: 38, height: 38, padding: 0 }}
        >
          {sending
            ? <span className="spinner-border spinner-border-sm"></span>
            : <span style={{ fontSize: '1rem' }}>➤</span>
          }
        </button>
      </form>
    </div>
  );
}
