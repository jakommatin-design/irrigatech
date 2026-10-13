import React, { useState } from 'react';
import { SensorProvider } from './context/SensorContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import MonitorView from './components/MonitorView';
import IrrigationView from './components/IrrigationView';
import NutritionView from './components/NutritionView';
import SolarView from './components/SolarView';
import ClimateControlView from './components/ClimateControlView';
import AlertsView from './components/AlertsView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import AccountPortal from './components/AccountPortal';
import TerminalView from './components/TerminalView';
import OpeningScreen from './components/OpeningScreen';
import AuthModal from './components/AuthModal';
import BottomNav from './components/BottomNav';

function MainApp() {
  const [currentTab, setCurrentTab] = useState('home');
  const { showSplash, setShowSplash, showAuthModal, setShowAuthModal } = useAuth();

  // If opening splash screen is requested (matching Image 1)
  if (showSplash) {
    return <OpeningScreen onContinue={() => {
      sessionStorage.setItem('irrigatech_visited', '1');
      setShowSplash(false);
    }} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Navigation Header with Logo & Full Sector Links */}
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Dynamic Active Sector - Matching all 9 sections in layout.png */}
      <main style={{ flex: 1 }}>
        {currentTab === 'home' && <DashboardView onNavigate={setCurrentTab} />}
        {currentTab === 'monitor' && <MonitorView />}
        {currentTab === 'irrigation' && <IrrigationView />}
        {currentTab === 'nutrition' && <NutritionView />}
        {currentTab === 'solar' && <SolarView />}
        {currentTab === 'climate' && <ClimateControlView />}
        {currentTab === 'alerts' && <AlertsView />}
        {currentTab === 'analytics' && <AnalyticsView />}
        {currentTab === 'settings' && <SettingsView onNavigate={setCurrentTab} />}
        {currentTab === 'account' && <AccountPortal />}
        {currentTab === 'terminal' && <TerminalView />}
      </main>

      {/* Mobile/Bottom Navigation Bar - matching 5-tab layout in layout.png */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Login & Registration Portal Modal (matching Image 2) */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SensorProvider>
        <MainApp />
      </SensorProvider>
    </AuthProvider>
  );
}
