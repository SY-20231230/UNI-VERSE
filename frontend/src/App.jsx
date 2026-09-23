import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import ScrollTopButton from './components/ScrollTopButton';
import Login from './pages/Login';
import Home from './pages/Home';
import Community from './pages/Community';
import CommunityWrite from './pages/CommunityWrite';
import CommunityDetail from './pages/CommunityDetail';
import Market from './pages/Market';
import MarketWrite from './pages/MarketWrite';
import MarketDetail from './pages/MarketDetail';
import Chat from './pages/Chat';
import MyPage from './pages/MyPage';
import UserProfile from './pages/UserProfile';
import AdminPage from './pages/AdminPage';
import { useApp } from './context/AppContext';

function RequireAuth({ children }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!state.isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    const isChatRoom = location.pathname.startsWith('/chat/');
    if (!isChatRoom) window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

export default function App() {
  const { state } = useApp();

  return (
    <>
      <div id="ambient"></div>
      {state.user && <Nav />}
      {state.user && <ScrollTopButton />}
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={state.user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/community"
          element={
            <RequireAuth>
              <Community />
            </RequireAuth>
          }
        />
        <Route
          path="/community/write"
          element={
            <RequireAuth>
              <CommunityWrite />
            </RequireAuth>
          }
        />
        <Route
          path="/community/:id/edit"
          element={
            <RequireAuth>
              <CommunityWrite />
            </RequireAuth>
          }
        />
        <Route
          path="/community/:id"
          element={
            <RequireAuth>
              <CommunityDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/market"
          element={
            <RequireAuth>
              <Market />
            </RequireAuth>
          }
        />
        <Route
          path="/market/write"
          element={
            <RequireAuth>
              <MarketWrite />
            </RequireAuth>
          }
        />
        <Route
          path="/market/:id/edit"
          element={
            <RequireAuth>
              <MarketWrite />
            </RequireAuth>
          }
        />
        <Route
          path="/market/:id"
          element={
            <RequireAuth>
              <MarketDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:id"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/mypage"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
        <Route
          path="/users/:id"
          element={
            <RequireAuth>
              <UserProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
