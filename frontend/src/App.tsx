import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import AssetsPage from './pages/AssetsPage';
import EditAssetPage from './pages/EditAssetPage';
import  DashboardPage  from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id/edit" element={<EditAssetPage />} />
        <Route path="/assignments" element={<PlaceholderPage title="Assignments" description="Track asset assignments" />} />
        <Route path="/people" element={<PlaceholderPage title="People" description="Manage personnel records" />} />
        <Route path="/departments" element={<PlaceholderPage title="Departments" description="View organizational departments" />} />
        <Route path="/locations" element={<PlaceholderPage title="Locations" description="Manage physical locations" />} />
        <Route path="/maintenance" element={<PlaceholderPage title="Maintenance" description="Schedule and track maintenance" />} />
        <Route path="/repairs" element={<PlaceholderPage title="Repairs" description="Manage repair requests" />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" description="Generate inventory reports" />} />
        <Route path="/audit-log" element={<PlaceholderPage title="Audit Log" description="View system audit trail" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" description="Configure system preferences" />} />
      </Route>
    </Routes>
  );
}
