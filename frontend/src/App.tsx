import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ModalProvider } from './hooks/useModal';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { FileExplorer } from './pages/FileExplorer';
import { Search } from './pages/Search';
import { MyPermissions } from './pages/MyPermissions';
import { Favorites } from './pages/Favorites';
import { NamingHelp } from './pages/NamingHelp';
import { Administration } from './pages/Administration';
import { Users } from './pages/Users';
import { Statistics } from './pages/Statistics';
import Audit from './pages/Audit';
import { DictionaryManagement } from './pages/DictionaryManagement';
import { ShareLinksPage } from './pages/ShareLinks';
import { SharedAccessPage } from './pages/SharedAccess';
import { PublicSharePage } from './pages/PublicShare';
import { Trash } from './pages/Trash';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component (for admin and superadmin)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// SuperAdmin Route Component (only for superadmin)
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Dictionary Management Route (accessible to all authenticated users)
const DictionaryRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // All authenticated users can view the dictionary
  // Only superadmin or users with can_manage_dictionary=True can modify (handled in the component)
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <ModalProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
        <Route path="/resetear-contrasena" element={<ResetPassword />} />
        <Route path="/shared" element={<SharedAccessPage />} />
        <Route path="/share/:token" element={<PublicSharePage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explorar"
          element={
            <ProtectedRoute>
              <FileExplorer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buscar"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-permisos"
          element={
            <ProtectedRoute>
              <MyPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favoritos"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ayuda-renombramiento"
          element={
            <ProtectedRoute>
              <NamingHelp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mensajes"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        {/* SuperAdmin routes */}
        <Route
          path="/administracion"
          element={
            <SuperAdminRoute>
              <Administration />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/links-compartidos"
          element={
            <SuperAdminRoute>
              <ShareLinksPage />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/papelera"
          element={
            <SuperAdminRoute>
              <Trash />
            </SuperAdminRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/usuarios"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />
        <Route
          path="/estadisticas"
          element={
            <AdminRoute>
              <Statistics />
            </AdminRoute>
          }
        />
        <Route
          path="/auditoria"
          element={
            <AdminRoute>
              <Audit />
            </AdminRoute>
          }
        />

        {/* Dictionary Management - accessible to all authenticated users */}
        <Route
          path="/diccionario"
          element={
            <DictionaryRoute>
              <DictionaryManagement />
            </DictionaryRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </ModalProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
