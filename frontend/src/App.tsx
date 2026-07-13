import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SimulationDetails } from './pages/SimulationDetails';
import { HistoryPage } from './pages/HistoryPage';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard component to shield authenticated views
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-500 font-mono text-xs space-y-3">
        <div className="h-4 w-4 rounded-full border border-zinc-700 border-t-primary animate-spin"></div>
        <span>Syncing session details...</span>
      </div>
    );
  }

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Workspace Pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history/:id"
              element={
                <ProtectedRoute>
                  <SimulationDetails />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
