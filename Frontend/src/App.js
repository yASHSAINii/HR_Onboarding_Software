import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LayoutRecruiter from './components/LayoutRecruiter';
import LayoutCandidate from './components/LayoutCandidate';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import DashboardRecruiter from './pages/DashboardRecruiter';
import DashboardCandidate from './pages/DashboardCandidate';
import UserManagement from './pages/UserManagement';
import BulkEmailSender from './pages/BulkEmailSender';
import HospitalListRecruiter from './pages/HospitalListRecruiter';
import HospitalListCandidate from './pages/HospitalListCandidate';
import Templates from './pages/Templates';
import Notifications from './pages/Notifications';
import Landing from './pages/Landing';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Recruiter routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <LayoutRecruiter />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRecruiter />} />
          <Route path="EmailSender" element={<BulkEmailSender />} />
          <Route path="HospitalListRecruiter" element={<HospitalListRecruiter />} />
          <Route path="Templates" element={<Templates />} />
          <Route path="UserManagement" element={<UserManagement />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* Candidate routes */}
        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <LayoutCandidate />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardCandidate />} />
          <Route path="HospitalList" element={<HospitalListCandidate />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;