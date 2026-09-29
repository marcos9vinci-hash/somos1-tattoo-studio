import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Welcome from './pages/Welcome';
import Terms from './pages/Terms';
import Home from './pages/Home';
import Network from './pages/Network';
import Booking from './pages/Booking';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminGate from './components/admin/AdminGate';
import Notifications from './pages/Notifications';
import HowItWorks from './pages/HowItWorks';
import Onboarding from './pages/Onboarding';
import Transfer from './pages/Transfer';
import BottomNav from './components/layout/BottomNav';
import TestCRM from './pages/TestCRM';
import GaleriaIA from './pages/GaleriaIA';
import TattooEngineModule from './components/studio/TattooEngineModule';
import SplashScreen from './components/layout/SplashScreen';
import PwaInstallBanner from './components/layout/PwaInstallBanner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, profile } = useAuth();
  
  if (loading) return <SplashScreen message="Carregando Somos 1..." />;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <Navigate to="/welcome" />;
  
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  
  if (!isAdmin) return <Navigate to="/admin" replace />;
  
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
};

export default function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode) {
      localStorage.setItem('inviteCode', refCode);
      console.log('Código de convite detectado:', refCode);
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* Rotas Oficiais do Cliente / Indicado */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/network" element={<ProtectedRoute><Network /></ProtectedRoute>} />
          <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />

          {/* Rotas Protegidas Exclusivas do Administrador / Tatuador */}
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/test-crm" element={<AdminRoute><TestCRM /></AdminRoute>} />
          <Route path="/galeria" element={<AdminRoute><GaleriaIA /></AdminRoute>} />
          <Route path="/estudio-ia" element={<AdminRoute><GaleriaIA /></AdminRoute>} />
          <Route path="/studio" element={<AdminRoute><div className="p-4 md:p-6 bg-black min-h-screen flex items-center justify-center"><TattooEngineModule /></div></AdminRoute>} />
          <Route path="/tattoo-engine" element={<AdminRoute><div className="p-4 md:p-6 bg-black min-h-screen flex items-center justify-center"><TattooEngineModule /></div></AdminRoute>} />
        </Routes>
        <PwaInstallBanner />
      </AuthProvider>
    </Router>
  );
}
