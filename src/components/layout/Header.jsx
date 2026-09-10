import { useEffect, useRef, useState } from 'react';
import { Bell, Menu, ChevronDown, Check, Plane, Wallet, FileStack, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../data/permissions';
import { initialsOf } from '../../utils/format';

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  travel: 'Travel Management',
  finance: 'Finance Management',
  documents: 'Document Control',
  audit: 'Audit Log',
  users: 'User Management',
  permissions: 'Permissions',
};

const MODULE_ICON = { Travel: Plane, Finance: Wallet, Documents: FileStack };

export default function Header({ view, setView, setMobileOpen }) {
  const { currentUser, role, switchRole, pendingActions, demoRoster } = useApp();
  const [roleOpen, setRoleOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const roleRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen((v) => !v)}><Menu size={17} /></button>
        <div className="topbar-title">{VIEW_TITLES[view] || 'Dashboard'}</div>
      </div>

      <div className="topbar-right">
        <div className="role-switcher" ref={notifRef}>
          <button className="icon-btn" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
            <Bell size={17} />
            {pendingActions.length > 0 && <span className="notif-dot">{pendingActions.length > 9 ? '9+' : pendingActions.length}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown-panel notif-panel">
              <div className="dropdown-header">Requires your action ({pendingActions.length})</div>
              {pendingActions.length === 0 && <div className="notif-empty">You're all caught up.</div>}
              {pendingActions.slice(0, 8).map((item) => {
                const Icon = MODULE_ICON[item.module] || AlertTriangle;
                return (
                  <button key={item.id} className="role-option" style={{ width: '100%' }} onClick={() => { setView(item.module.toLowerCase()); setNotifOpen(false); }}>
                    <div className="notif-icon" style={{ background: item.priority === 'high' ? 'var(--red-bg)' : 'var(--brand-light)', color: item.priority === 'high' ? 'var(--red)' : 'var(--brand)' }}>
                      <Icon size={15} />
                    </div>
                    <div className="notif-title-wrap" style={{ textAlign: 'left' }}>
                      <div className="notif-title">{item.label}</div>
                      <div className="notif-msg">{item.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="role-switcher" ref={roleRef}>
          <button className="role-switcher-btn" onClick={() => setRoleOpen((v) => !v)}>
            <div className="avatar">{initialsOf(currentUser.name)}</div>
            <div>
              <div className="role-switcher-name">{currentUser.name}</div>
              <div className="role-switcher-role">{ROLE_LABELS[role]}</div>
            </div>
            <ChevronDown size={15} />
          </button>
          {roleOpen && (
            <div className="dropdown-panel">
              <div className="dropdown-header">Demo — switch role</div>
              {demoRoster.map((u) => (
                <button key={u.id} className={`role-option ${u.role === role ? 'active' : ''}`} onClick={() => { switchRole(u.role); setRoleOpen(false); }}>
                  <div className="avatar">{initialsOf(u.name)}</div>
                  <div className="role-option-text">
                    <span className="role-option-name">{u.name}{u.role === role && <Check size={13} style={{ marginLeft: 6, verticalAlign: -2, color: 'var(--brand)' }} />}</span>
                    <span className="role-option-desc">{ROLE_LABELS[u.role]} — {ROLE_DESCRIPTIONS[u.role]}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
