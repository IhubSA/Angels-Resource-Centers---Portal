import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { money, pct } from '../../utils/format';
import BudgetsPanel from './BudgetsPanel';
import RequestsPanel from './RequestsPanel';
import ExpensesPanel from './ExpensesPanel';
import ReportsPanel from './ReportsPanel';

function OverviewTab() {
  const { budgets, financeRequests, scope, currentUser } = useApp();
  const financeScope = scope('finance');
  const scoped = financeScope === 'own' || financeScope === 'department'
    ? budgets.filter((b) => b.department === currentUser.department)
    : budgets;
  const totalAllocated = scoped.reduce((s, b) => s + b.allocated, 0);
  const totalCommitted = scoped.reduce((s, b) => s + b.committed, 0);
  const totalSpent = scoped.reduce((s, b) => s + b.spent, 0);
  const available = totalAllocated - totalCommitted - totalSpent;
  const pendingRequestValue = financeRequests.filter((fr) => fr.status.startsWith('pending')).reduce((s, fr) => s + fr.amount, 0);

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="stat-tile"><div className="stat-label">Total Allocated</div><div className="stat-value">{money(totalAllocated)}</div><div className="stat-sub">FY2026 · {scoped.length} budget lines</div></div>
        <div className="stat-tile"><div className="stat-label">Committed</div><div className="stat-value">{money(totalCommitted)}</div><div className="stat-sub">Approved, not yet paid</div></div>
        <div className="stat-tile"><div className="stat-label">Spent</div><div className="stat-value">{money(totalSpent)}</div><div className="stat-sub">{pct(totalSpent, totalAllocated)}% of allocation</div></div>
        <div className="stat-tile"><div className="stat-label">Available</div><div className="stat-value" style={{ color: available < 0 ? 'var(--red)' : 'inherit' }}>{money(available)}</div><div className="stat-sub">{money(pendingRequestValue)} in pending requests</div></div>
      </div>

      <div className="card">
        <div className="card-header"><div><h3>Real-Time Budget vs. Actual</h3><p>Updates instantly as requests and reimbursements move through approval</p></div></div>
        <div className="card-pad">
          {scoped.map((b) => {
            const spentPct = pct(b.spent, b.allocated);
            const commitPct = pct(b.committed, b.allocated);
            const avail = b.allocated - b.spent - b.committed;
            return (
              <div key={b.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <strong>{b.name}</strong>
                  <span className="cell-muted">{money(avail)} available</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${spentPct}%`, background: 'var(--brand)' }} />
                  <div className="progress-fill" style={{ width: `${commitPct}%`, background: 'var(--amber)' }} />
                </div>
                {avail < 0 && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Over budget by {money(Math.abs(avail))}</div>}
              </div>
            );
          })}
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--brand)' }} /> Spent</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--amber)' }} /> Committed</span>
            <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--slate-bg)' }} /> Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTrailTab() {
  const { auditLog } = useApp();
  const financeLog = auditLog.filter((a) => a.module === 'Finance' || a.module === 'Travel');
  return (
    <div className="card">
      <div className="card-header"><div><h3>Finance & Travel Audit Trail</h3><p>Every approval, rejection and payment action is logged for compliance</p></div></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Reference</th><th>Details</th></tr></thead>
          <tbody>
            {financeLog.map((a) => (
              <tr key={a.id}>
                <td className="cell-muted cell-mono">{a.timestamp}</td>
                <td>{a.userName}</td>
                <td>{a.action}</td>
                <td className="cell-mono cell-muted">{a.targetId}</td>
                <td className="cell-muted">{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinanceModule() {
  const { can, scope } = useApp();
  const [tab, setTab] = useState('overview');
  const isOwnScope = scope('finance') === 'own';

  const tabs = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'budgets', label: 'Budgets', show: !isOwnScope },
    { key: 'requests', label: 'Requests', show: true },
    { key: 'expenses', label: 'Travel Expenses', show: true },
    { key: 'reports', label: 'Reports & Export', show: can('finance', 'export') },
    { key: 'audit', label: 'Audit Trail', show: can('audit', 'view') },
  ].filter((t) => t.show);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Management</h1>
          <p className="page-subtitle">Budgets, Finance Hub requests, expense tracking and financial reporting</p>
        </div>
      </div>
      <div className="tabs">
        {tabs.map((t) => <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'budgets' && !isOwnScope && <BudgetsPanel />}
      {tab === 'requests' && <RequestsPanel />}
      {tab === 'expenses' && <ExpensesPanel />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'audit' && <AuditTrailTab />}
    </div>
  );
}
