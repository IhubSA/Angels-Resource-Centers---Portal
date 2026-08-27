import { LayoutDashboard, Plane, Wallet, FileStack, ShieldCheck, Users, KeyRound, ChevronsLeft, ChevronsRight, Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar({ view, setView, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { can, pendingActions } = useApp();

  const countFor = (module) => pendingActions.filter((a) => a.module === module).length;

  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { key: 'travel', label: 'Travel Management', icon: Plane, show: true, count: countFor('Travel') },
    { key: 'finance', label: 'Finance Management', icon: Wallet, show: true, count: countFor('Finance') },
    { key: 'documents', label: 'Document Control', icon: FileStack, show: true, count: countFor('Documents') },
  ];

  const adminItems = [
    { key: 'audit', label: 'Audit Log', icon: ShieldCheck, show: can('audit', 'view') },
    { key: 'users', label: 'User Management', icon: Users, show: can('admin', 'manageUsers') },
    { key: 'permissions', label: 'Permissions', icon: KeyRound, show: can('admin', 'managePermissions') },
  ].filter((i) => i.show);

  const go = (key) => { setView(key); setMobileOpen(false); };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? '' : 'mobile-hidden'}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark"><Heart size={17} /></div>
        {!collapsed && (
          <div>
            <div className="sidebar-brand-text">Angels Resource Centre</div>
            <div className="sidebar-brand-sub">NPO Management System</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button key={item.key} className={`sidebar-link ${view === item.key ? 'active' : ''}`} onClick={() => go(item.key)} title={item.label}>
            <item.icon size={17} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.count > 0 && <span className="badge-count">{item.count}</span>}
          </button>
        ))}

        {adminItems.length > 0 && (
          <>
            {!collapsed && <div className="sidebar-section-label">Compliance & Admin</div>}
            {adminItems.map((item) => (
              <button key={item.key} className={`sidebar-link ${view === item.key ? 'active' : ''}`} onClick={() => go(item.key)} title={item.label}>
                <item.icon size={17} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-foot">
        <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
