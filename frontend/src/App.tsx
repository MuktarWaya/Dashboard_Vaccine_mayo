import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicDashboard from './components/dashboard/PublicDashboard';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';
import SettingsPage from './components/settings/SettingsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PublicDashboard />} />
        <Route path="/executive" element={<ExecutiveDashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
