import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../api/client';

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchCompanyProfile = createAsyncThunk(
  'company/fetchProfile',
  async (id, { rejectWithValue }) => {
    try {
      // 'me' is a special keyword to fetch the current user's own company
      const url = id === 'me' ? '/companies/me' : `/companies/${id}`;
      const { data } = await client.get(url);
      return data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load company.');
    }
  },
);

export const fetchCompanyListings = createAsyncThunk(
  'company/fetchListings',
  async ({ id, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const { data } = await client.get(`/companies/${id}/listings`, { params: { page, limit } });
      return { listings: data.listings, pagination: data.pagination };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load listings.');
    }
  },
);

export const registerCompany = createAsyncThunk(
  'company/register',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await client.post('/companies/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed.');
    }
  },
);

export const updateCompanyProfile = createAsyncThunk(
  'company/updateProfile',
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      const { data } = await client.put(`/companies/${id}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.company;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Profile update failed.');
    }
  },
);

export const submitContactInquiry = createAsyncThunk(
  'company/submitInquiry',
  async ({ id, name, phone, message }, { rejectWithValue }) => {
    try {
      await client.post(`/companies/${id}/contact`, { name, phone, message });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Inquiry submission failed.');
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const companySlice = createSlice({
  name: 'company',
  initialState: {
    profile: null,
    listings: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    loading: false,
    error: null,
    inquirySent: false,
  },
  reducers: {
    clearCompanyError(state) {
      state.error = null;
    },
    clearInquirySent(state) {
      state.inquirySent = false;
    },
    clearCompany(state) {
      state.profile = null;
      state.listings = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(fetchCompanyProfile.pending, pending)
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, rejected)

      .addCase(fetchCompanyListings.pending, pending)
      .addCase(fetchCompanyListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload.listings;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCompanyListings.rejected, rejected)

      .addCase(registerCompany.pending, pending)
      .addCase(registerCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(registerCompany.rejected, rejected)

      .addCase(updateCompanyProfile.pending, pending)
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateCompanyProfile.rejected, rejected)

      .addCase(submitContactInquiry.pending, pending)
      .addCase(submitContactInquiry.fulfilled, (state) => {
        state.loading = false;
        state.inquirySent = true;
      })
      .addCase(submitContactInquiry.rejected, rejected);
  },
});

export const { clearCompanyError, clearInquirySent, clearCompany } = companySlice.actions;
export default companySlice.reducer;
