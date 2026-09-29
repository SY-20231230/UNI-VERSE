import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { createReportApi } from './reportApi';
import { sessionApiOptions } from './session';

export default function useReportApi() {
  const { state } = useApp();
  // 토큰은 세션에서 직접 읽지만, 로그인·로그아웃 때 새로 만들도록 의존성으로 둔다.
  const token = state.accessToken;
  return useMemo(() => createReportApi(sessionApiOptions), [token]);
}
