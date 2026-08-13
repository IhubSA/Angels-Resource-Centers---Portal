import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Toast from './components/common/Toast';
import Dashboard from './components/dashboard/Dashboard';
import TravelModule from './components/travel/TravelModule';
import FinanceModule from './components/finance/FinanceModule';
import DocumentsModule from './components/documents/DocumentsModule';
import AuditLogViewer from './components/audit/AuditLogViewer';
import UserManagement from './components/admin/UserManagement';
import { useApp } from './context/AppContext';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can } = useApp();

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <Dashboard setView={setView} />;
      case 'travel':
        return <TravelModule />;
      case 'finance':
        return <FinanceModule />;
      case 'documents':
        return <DocumentsModule />;
      case 'audit':
        if (!can('audit', 'view')) return <AccessDenied />;
        return <AuditLogViewer />;
      case 'users':
        if (!can('admin', 'manageUsers')) return <AccessDenied />;
        return <UserManagement />;
      default:
        return <Dashboard setView={setView} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="main-col">
        <Header view={view} setView={setView} setMobileOpen={setMobileOpen} />
        <main className="content">{renderView()}</main>
      </div>
      <Toast />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="access-denied">
      <ShieldAlert size={40} />
      <h3 style={{ margin: '12px 0 4px' }}>Access restricted</h3>
      <p>Your current role doesn't have permission to view this page.</p>
    </div>
  );
}
