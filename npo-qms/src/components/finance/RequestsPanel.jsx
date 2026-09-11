import { useMemo, useState } from 'react';
import { Plus, Search, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import FinanceRequestForm from './FinanceRequestForm';
import FinanceRequestDetail from './FinanceRequestDetail';
import { REQUEST_TYPES } from '../../data/permissions';
import { money, formatDate } from '../../utils/format';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_eda', label: 'EDA Review' },
  { key: 'pending_mentor', label: 'Mentor Approval' },
  { key: 'pending_line_manager', label: 'Line Manager' },
  { key: 'pending_bookkeeper_verification', label: 'Bookkeeper Verification' },
  { key: 'pending_accountant_review', label: 'Accountant Review' },
  { key: 'pending_ceo', label: 'CEO Approval' },
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'returned_by_eda', label: 'Returned (EDA)' },
  { key: 'returned_by_mentor', label: 'Returned (Mentor)' },
  { key: 'returned_by_line_manager', label: 'Returned (Line Manager)' },
  { key: 'returned_by_bookkeeper', label: 'Returned (Bookkeeper)' },
  { key: 'returned_by_accountant', label: 'Returned (Accountant)' },
  { key: 'returned_by_ceo', label: 'Declined (CEO)' },
  { key: 'completed', label: 'Completed' },
];

export default function RequestsPanel() {
  const { financeRequests, budgets, currentUser, can, scope } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const scoped = useMemo(() => {
    const financeScope = scope('finance');
    return financeRequests.filter((fr) => {
      if (financeScope === 'own') return fr.submittedById === currentUser.id;
      if (financeScope === 'department') return budgets.find((b) => b.id === fr.budgetId)?.department === currentUser.department || fr.submittedById === currentUser.id;
      return true;
    });
  }, [financeRequests, budgets, scope, currentUser]);

  const filtered = scoped.filter((fr) => {
    if (statusFilter !== 'all' && fr.status !== statusFilter) return false;
    if (typeFilter !== 'all' && fr.requestType !== typeFilter) return false;
    if (query && !`${fr.vendor} ${fr.description} ${fr.submittedBy} ${fr.id}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = STATUS_FILTERS.map((f) => ({ ...f, count: f.key === 'all' ? scoped.length : scoped.filter((fr) => fr.status === f.key).length }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance Hub Requests</h1>
          <p className="page-subtitle">Line Manager → Bookkeeper → Accountant → CEO → payment (APR adds Entrepreneur Dev. Advisor → Mentor first)</p>
        </div>
        {can('finance', 'create') && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> New Request</button>
        )}
      </div>

      <div className="tabs">
        {counts.map((f) => (
          <button key={f.key} className={`tab-btn ${statusFilter === f.key ? 'active' : ''}`} onClick={() => setStatusFilter(f.key)}>
            {f.label} {f.count > 0 && <span style={{ color: 'var(--text-faint)' }}>({f.count})</span>}
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="search-box">
          <Search size={14} />
          <input className="input" placeholder="Search vendor, description, requester, or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" style={{ maxWidth: 220 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All request types</option>
          {REQUEST_TYPES.map((rt) => <option key={rt.key} value={rt.key}>{rt.label} ({rt.short})</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="No requests found" subtitle="Try adjusting your filters, or submit a new request." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Vendor</th><th>Requester</th><th>Amount</th><th>Submitted</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fr) => (
                  <tr key={fr.id}>
                    <td className="cell-mono cell-muted">{fr.id}</td>
                    <td className="cell-muted">{REQUEST_TYPES.find((rt) => rt.key === fr.requestType)?.short || fr.requestType}</td>
                    <td><button className="row-link" onClick={() => setSelected(fr.id)}>{fr.vendor || fr.description}</button></td>
                    <td className="cell-muted">{fr.submittedBy}</td>
                    <td className="cell-mono">{money(fr.amount)}</td>
                    <td className="cell-muted">{formatDate(fr.submittedDate)}</td>
                    <td><StatusBadge status={fr.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(fr.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <FinanceRequestForm open={showForm} onClose={() => setShowForm(false)} />}
      {selected && <FinanceRequestDetail requestId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
