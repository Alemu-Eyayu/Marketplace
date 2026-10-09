import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

export default function NotificationTest() {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const { items, unreadCount, unreadMessages, totalUnread } = useSelector((s) => s.notifications);
  const { conversations } = useSelector((s) => s.messages);

  return (
    <div className="container py-4">
      <h2>Notification System Test</h2>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Authentication Status</h5>
            </div>
            <div className="card-body">
              {user ? (
                <div>
                  <p><strong>User:</strong> {user.fullName}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Phone:</strong> {user.phone}</p>
                  <span className="badge bg-success">Authenticated</span>
                </div>
              ) : (
                <div>
                  <p>No user logged in</p>
                  <span className="badge bg-warning">Not Authenticated</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Notification Counts</h5>
            </div>
            <div className="card-body">
              <p><strong>Total Unread:</strong> <span className="badge bg-primary">{totalUnread}</span></p>
              <p><strong>Unread Notifications:</strong> <span className="badge bg-info">{unreadCount}</span></p>
              <p><strong>Unread Messages:</strong> <span className="badge bg-success">{unreadMessages}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Recent Notifications ({items.length})</h5>
            </div>
            <div className="card-body">
              {items.length === 0 ? (
                <p className="text-muted">No notifications</p>
              ) : (
                <div className="list-group list-group-flush">
                  {items.slice(0, 5).map((notification) => (
                    <div key={notification._id} className={`list-group-item ${!notification.isRead ? 'bg-light' : ''}`}>
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{notification.title}</strong>
                          <p className="mb-1 small">{notification.body}</p>
                          <small className="text-muted">
                            {new Date(notification.createdAt).toLocaleString()}
                          </small>
                        </div>
                        {!notification.isRead && (
                          <span className="badge bg-primary">New</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Recent Conversations ({conversations.length})</h5>
            </div>
            <div className="card-body">
              {conversations.length === 0 ? (
                <p className="text-muted">No conversations</p>
              ) : (
                <div className="list-group list-group-flush">
                  {conversations.slice(0, 5).map((conversation) => (
                    <div key={conversation._id} className="list-group-item">
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{conversation.listing?.title || 'Conversation'}</strong>
                          {conversation.lastMessage && (
                            <p className="mb-1 small">{conversation.lastMessage.body || 'Attachment'}</p>
                          )}
                          <small className="text-muted">
                            {conversation.updatedAt && new Date(conversation.updatedAt).toLocaleString()}
                          </small>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <span className="badge bg-success">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Instructions</h5>
            </div>
            <div className="card-body">
              <h6>To test the notification system:</h6>
              <ol>
                <li><strong>Login:</strong> Go to <a href="/login">/login</a> and authenticate with a user account</li>
                <li><strong>Check Navbar:</strong> Look for the notification bell (🔔) in the navbar with a red badge showing unread count</li>
                <li><strong>Send Messages:</strong> Use multiple browser tabs/windows with different users to send messages</li>
                <li><strong>Real-time Updates:</strong> Notifications should appear instantly via Socket.io</li>
                <li><strong>Mark as Read:</strong> Click notifications to mark them as read</li>
              </ol>
              
              <h6 className="mt-3">Backend Requirements:</h6>
              <ul>
                <li>Backend server must be running on <code>http://localhost:5000</code></li>
                <li>MongoDB must be connected</li>
                <li>Redis must be available for Socket.io</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}