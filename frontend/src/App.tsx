import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ApplicationSettingsProvider } from './context/ApplicationSettingsContext';
import { Branding } from './components/Branding';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequirePermission } from './components/RequirePermission';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import AssetsPage from './pages/AssetsPage';
import EditAssetPage from './pages/EditAssetPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import DepartmentsPage from './pages/DepartmentsPage';
import PeoplePage from './pages/PeoplePage';
import LocationsPage from './pages/LocationsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import MaintenancePage from './pages/MaintenancePage';
import RepairsPage from './pages/RepairsPage';
import AuditLogPage from './pages/AuditLogPage';
import { ReportsPageContent as ReportsPage } from './features/reports/ReportsPageContent';
import UsersPage from './pages/UsersPage';
import TicketsPage from './pages/TicketsPage';
import EquipmentRequestsPage from './pages/EquipmentRequestsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import { PortalLayout } from './layouts/PortalLayout';
import PortalAssetsPage from './pages/PortalAssetsPage';
import PortalRequestsPage from './pages/PortalRequestsPage';

/** Sends admins to the dashboard and staff-only users to the portal. */
function LandingRedirect() {
  const { hasPermission } = useAuth();
  return <Navigate to={hasPermission('dashboard.view') ? '/dashboard' : '/portal'} replace />;
}

export default function App() {
  return (
    <ApplicationSettingsProvider>
      <Branding />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<LandingRedirect />} />
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<PortalAssetsPage />} />
              <Route path="/portal/requests" element={<PortalRequestsPage />} />
            </Route>
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<MainLayout />}>
              <Route element={<RequirePermission permission="dashboard.view" />}><Route path="/dashboard" element={<DashboardPage />} /></Route>
              <Route element={<RequirePermission permission="assets.view" />}><Route path="/assets" element={<AssetsPage />} /><Route path="/assets/:id/edit" element={<EditAssetPage />} /></Route>
              <Route element={<RequirePermission permission="assignments.view" />}><Route path="/assignments" element={<AssignmentsPage />} /></Route>
              <Route element={<RequirePermission permission="people.view" />}><Route path="/people" element={<PeoplePage />} /></Route>
              <Route element={<RequirePermission permission="departments.view" />}><Route path="/departments" element={<DepartmentsPage />} /></Route>
              <Route element={<RequirePermission permission="locations.view" />}><Route path="/locations" element={<LocationsPage />} /></Route>
              <Route element={<RequirePermission permission="maintenance.view" />}><Route path="/maintenance" element={<MaintenancePage />} /></Route>
              <Route element={<RequirePermission permission="repairs.view" />}><Route path="/repairs" element={<RepairsPage />} /></Route>
              <Route element={<RequirePermission permission="tickets.view" />}><Route path="/tickets" element={<TicketsPage />} /></Route>
              <Route element={<RequirePermission permission="requests.view" />}><Route path="/equipment-requests" element={<EquipmentRequestsPage />} /></Route>
              <Route element={<RequirePermission permission="reports.view" />}><Route path="/reports" element={<ReportsPage />} /></Route>
              <Route element={<RequirePermission permission="audit.view" />}><Route path="/audit-log" element={<AuditLogPage />} /></Route>
              <Route element={<RequirePermission permission="users.view" />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
              <Route element={<RequirePermission permission="settings.view" />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="/forbidden" element={<ForbiddenPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </ApplicationSettingsProvider>
  );
}
