import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, clearAuth } from '../store/authSlice';
import { fetchCompanyProfile } from '../store/companySlice';
import client from '../api/client';

export default function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          dispatch(clearAuth());
          return;
        }

        const { data } = await client.post('/auth/refresh', { refreshToken });

        if (data.success) {
          localStorage.setItem('refreshToken', data.refreshToken);

          // Fetch fresh user profile
          const userResponse = await client.get('/auth/me');
          const freshUser = userResponse.data.user;

          dispatch(setCredentials({
            user: freshUser,
            accessToken: data.accessToken,
          }));

          // Load company profile for company users so navbar shows company name everywhere
          if (freshUser.role === 'company') {
            dispatch(fetchCompanyProfile('me'));
          }
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.warn('Auth initialization error:', error.message);
        }
        localStorage.removeItem('refreshToken');
        dispatch(clearAuth());
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  if (isInitializing) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return children;
}