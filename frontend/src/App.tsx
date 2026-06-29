import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicDashboard from './components/dashboard/PublicDashboard';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PublicDashboard />} />
        <Route path="/executive" element={<ExecutiveDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
