import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
  },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    addNotification(state, action) {
      // Prevent duplicates
      const exists = state.items.some((n) => n._id === action.payload._id);
      if (!exists) {
        state.items.unshift(action.payload);
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    markRead(state, action) {
      const n = state.items.find((n) => n._id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    clearNotifications(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  setLoading,
  clearNotifications,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
