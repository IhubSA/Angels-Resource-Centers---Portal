import { useMemo, useState } from 'react';
import { Search, ShieldCheck, FileDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import EmptyState from '../common/EmptyState';

export default function AuditLogViewer() {
  const { auditLog, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const modules = ['all', ...new Set(auditLog.map((a) => a.module))];

  const filtered = useMemo(() => auditLog.filter((a) => {
    if (moduleFilter !== 'all' && a.module !== moduleFilter) return false;
    if (query && !`${a.action} ${a.userName} ${a.targetId} ${a.details}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [auditLog, moduleFilter, query]);

  function exportLog() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['timestamp', 'userName', 'role', 'action', 'module', 'targetId', 'details'];
    const csv = [headers.join(','), ...filtered.map((a) => headers.map((h) => esc(a[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'audit_log.csv'; document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
    showToast('Audit log exported');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Full compliance trail across Travel, Finance and Document Control</p>
        </div>
        <button className="btn btn-secondary" onClick={exportLog}><FileDown size={15} /> Export CSV</button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input className="input" placeholder="Search action, user, reference…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" style={{ width: 180 }} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          {modules.map((m) => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? <EmptyState icon={ShieldCheck} title="No audit entries found" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Reference</th><th>Details</th></tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="cell-mono cell-muted">{a.timestamp}</td>
                    <td>{a.userName}</td>
                    <td className="cell-muted">{a.role}</td>
                    <td>{a.action}</td>
                    <td><span className="badge badge-slate">{a.module}</span></td>
                    <td className="cell-mono cell-muted">{a.targetId || '—'}</td>
                    <td className="cell-muted">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
