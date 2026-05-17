import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { setNotifications, addNotification, clearNotifications } from '../store/notificationsSlice';
import client from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function NotificationProvider({ children }) {
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((s) => s.auth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      dispatch(clearNotifications());
      return;
    }

    // Load initial notifications
    client.get('/notifications')
      .then(({ data }) => {
        if (data.success) dispatch(setNotifications(data.notifications));
      })
      .catch(() => {});

    // Socket.io for real-time notification updates
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:join', user._id);
    });

    socket.on('connect_error', () => {
      // silent — polling fallback handles reconnection
    });

    // New notification arrives (includes message notifications)
    socket.on('notification:new', (notification) => {
      dispatch(addNotification(notification));
      if (Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.body, icon: '/favicon.svg' });
      }
    });

    // Request browser notification permission once
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      socket.emit('user:leave', user._id);
      socket.disconnect();
    };
  }, [user, accessToken, dispatch]);

  return children;
}
