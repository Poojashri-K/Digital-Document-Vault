import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { MyDocuments } from './pages/MyDocuments';
import { UploadPage } from './pages/Upload';
import { DocumentDetails } from './pages/DocumentDetails';
import { SharedWithMe } from './pages/SharedWithMe';
import { AdminAudit } from './pages/AdminAudit';
import { AdminUsers } from './pages/AdminUsers';
import { Profile } from './pages/Profile';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes inside Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/documents" element={<MyDocuments />} />
              <Route path="/documents/upload" element={<UploadPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/documents/:id" element={<DocumentDetails />} />
              <Route path="/shared-with-me" element={<SharedWithMe />} />
              <Route path="/shared" element={<SharedWithMe />} />
              <Route path="/profile" element={<Profile />} />

              {/* Administrative Routes */}
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={['ROLE_VAULT_ADMIN', 'ROLE_SYSTEM_ADMIN']}>
                    <AdminAudit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ROLE_SYSTEM_ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
