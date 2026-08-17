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
import { ShieldAlert, Heart, AlertCircle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { can, loading, loadError } = useApp();

  if (loading) return <LoadingScreen />;
  if (loadError) return <LoadErrorScreen message={loadError} />;

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

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'var(--bg)' }}>
      <div className="sidebar-brand-mark" style={{ animation: 'pulse 1.4s ease-in-out infinite' }}><Heart size={17} /></div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 600 }}>Loading Little Angels NPO data…</div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function LoadErrorScreen({ message }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--bg)', padding: 24, textAlign: 'center' }}>
      <AlertCircle size={36} color="var(--red)" />
      <h3 style={{ margin: 0 }}>Couldn't load data</h3>
      <p style={{ color: 'var(--text-muted)', maxWidth: 440, fontSize: 13.5 }}>{message}</p>
      <p style={{ color: 'var(--text-faint)', maxWidth: 440, fontSize: 12 }}>
        Check that <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are set correctly, then reload the page.
      </p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
