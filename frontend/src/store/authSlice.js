import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.error = null;
    },
  },
});

export const { setCredentials, setUser, setLoading, setError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
