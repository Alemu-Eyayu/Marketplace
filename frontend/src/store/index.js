import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import messagesReducer from './messagesSlice';
import notificationsReducer from './notificationsSlice';
import companyReducer from './companySlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    messages: messagesReducer,
    notifications: notificationsReducer,
    company: companyReducer,
  },
});

export default store;
