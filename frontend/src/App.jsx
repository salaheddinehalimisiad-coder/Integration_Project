import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import ThemeProvider from './components/Theme/ThemeProvider';
import ToastProvider, { useToast } from './components/Toast/ToastProvider';
import ErrorBoundary from './components/UI/ErrorBoundary';
import SEO from './components/SEO/SEO';

import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Loading from './pages/Loading';
import NotFound from './pages/NotFound';

import Dashboard from './pages/Dashboard';
import Console from './pages/Console';
import Sources from './pages/Sources';
import Schema from './pages/Schema';
import Reconciliation from './pages/Reconciliation';
import Conflicts from './pages/Conflicts';
import Analytics from './pages/Analytics';
import RBAC from './pages/RBAC';
import Audit from './pages/Audit';

import { onSessionExpired } from './lib/api';

function AppContent() {
  const [user, setUser] = useState(null);
  const [showLoading, setShowLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const [mode, setMode] = useState('GAV');
  const toast = useToast();

  useEffect(() => {
    try {
      const token = localStorage.getItem('dm_token');
      const userData = localStorage.getItem('dm_user');
      if (token && userData) setUser(JSON.parse(userData));
    } catch {
      localStorage.removeItem('dm_token');
      localStorage.removeItem('dm_user');
    } finally {
      setBooted(true);
    }
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      toast.warning('Session expirée', 'Veuillez vous reconnecter.');
    });
  }, [toast]);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    setShowLoading(true);
    const u = userData?.user || userData || {};
    toast.info(
      `Bienvenue, ${u.name || u.username || 'Utilisateur'} !`,
      `Rôle : ${u.role || 'Inconnu'}`,
      { image: '/logo.png', duration: 5000 }
    );
  }, [toast]);

  const handleLoadingComplete = useCallback(() => {
    setShowLoading(false);
  }, []);

  const handleLogout = useCallback(() => {
    const currentUser = user?.user || user || {};
    setUser(null);
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_user');
    toast.info(
      'Déconnexion réussie',
      currentUser.name || currentUser.username ? `À bientôt, ${currentUser.name || currentUser.username} !` : 'À bientôt.',
      { image: '/logo.png', duration: 4000 }
    );
  }, [user, toast]);

  if (!booted) return null;

  if (showLoading) {
    return <Loading onComplete={handleLoadingComplete} />;
  }

  if (!user) {
    return (
      <>
        <SEO title="Connexion — DataMediator" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <SEO title="DataMediator" canonicalUrl="/" />
      <Routes>
        <Route element={<AppLayout user={user} onLogout={handleLogout} mode={mode} setMode={setMode} />}>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/console"        element={<Console />} />
          <Route path="/sources"        element={<Sources />} />
          <Route path="/schema"         element={<Schema />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/conflicts"      element={<Conflicts />} />
          <Route path="/analytics"      element={<Analytics />} />
          <Route path="/rbac"           element={<RBAC />} />
          <Route path="/audit"          element={<Audit />} />
        </Route>
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
}

import { StoreProvider } from './store/StoreContext';

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <ToastProvider>
            <StoreProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </StoreProvider>
          </ToastProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
