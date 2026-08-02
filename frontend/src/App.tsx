import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MainLayout } from './layouts/MainLayout';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        {/* Additional routes will be added as features are implemented */}
      </Route>
    </Routes>
  );
}