import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { createAdminReportApi } from './adminReportApi';

export default function useAdminReportApi() {
  const { state } = useApp();
  const token = state.accessToken;
  return useMemo(() => createAdminReportApi({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    getAccessToken: () => token,
  }), [token]);
}
