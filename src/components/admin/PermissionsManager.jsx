import { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLES, ROLE_LABELS, PERMISSION_SCHEMA } from '../../data/permissions';

const VIEW_SCOPE_LABELS = { own: 'Own only', department: 'Department', all: 'Everything' };

export default function PermissionsManager() {
  const { rolePermissions, updatePermission, updateViewScope } = useApp();
  const [moduleKey, setModuleKey] = useState(PERMISSION_SCHEMA[0].key);
  const module = PERMISSION_SCHEMA.find((m) => m.key === moduleKey);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Permissions</h1>
          <p className="page-subtitle">Who can view, act, and approve at each stage — changes apply immediately, org-wide</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Info size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--text-muted)' }} />
        <p className="hint" style={{ margin: 0 }}>
          This matrix is stored in the database, not the app's code — toggling a checkbox here changes what that role can do for every user, on every device, right away. The Admin role's own user &amp; permission management rights are locked to prevent accidental lockout.
        </p>
      </div>

      <div className="tabs">
        {PERMISSION_SCHEMA.map((m) => (
          <button key={m.key} className={`tab-btn ${moduleKey === m.key ? 'active' : ''}`} onClick={() => setModuleKey(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 170 }}>Role</th>
                {module.hasViewScope && <th style={{ minWidth: 130 }}>View Scope</th>}
                {module.actions.map((a) => (
                  <th key={a.key} style={{ minWidth: 120 }}>{a.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(ROLES).map((roleKey) => {
                const perm = rolePermissions[roleKey]?.[moduleKey] || {};
                const lockRow = roleKey === ROLES.ADMIN && moduleKey === 'admin';
                return (
                  <tr key={roleKey}>
                    <td style={{ fontWeight: 650 }}>{ROLE_LABELS[roleKey]}</td>
                    {module.hasViewScope && (
                      <td>
                        <select
                          className="input"
                          style={{ padding: '4px 8px', fontSize: 12.5 }}
                          value={perm.view || 'own'}
                          onChange={(e) => updateViewScope(roleKey, moduleKey, e.target.value)}
                        >
                          {Object.entries(VIEW_SCOPE_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                        </select>
                      </td>
                    )}
                    {module.actions.map((a) => (
                      <td key={a.key} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(perm[a.key])}
                          disabled={lockRow}
                          title={lockRow ? 'Admin always retains this right' : undefined}
                          onChange={(e) => updatePermission(roleKey, moduleKey, a.key, e.target.checked)}
                          style={{ width: 16, height: 16, cursor: lockRow ? 'not-allowed' : 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <ShieldCheck size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--text-muted)' }} />
        <p className="hint" style={{ margin: 0 }}>
          Every change here is written to the audit log under the "Admin" module, tagged with who made it and when.
        </p>
      </div>
    </div>
  );
}
