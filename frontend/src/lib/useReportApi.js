import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { createReportApi } from './reportApi';

export default function useReportApi() {
  const { state } = useApp();
  const token = state.accessToken;
  return useMemo(() => createReportApi({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    getAccessToken: () => token,
  }), [token]);
}
