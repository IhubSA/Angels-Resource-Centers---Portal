import { useMemo, useState } from 'react';
import { Plus, Search, Plane } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import TravelRequestForm from './TravelRequestForm';
import TravelDetail from './TravelDetail';
import { money, formatDate } from '../../utils/format';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_hod', label: 'Pending HOD' },
  { key: 'pending_quality', label: 'Quality Review' },
  { key: 'pending_booking', label: 'Ready to Book' },
  { key: 'finance_hold', label: 'Finance Hold' },
  { key: 'pending_finance_review', label: 'Finance Review' },
  { key: 'pending_ceo', label: 'CEO Approval' },
  { key: 'pending_board', label: 'Board Sign-off' },
  { key: 'cleared_for_travel', label: 'Cleared for Travel' },
  { key: 'expense_review', label: 'Receipt Check' },
  { key: 'reimbursement_hold', label: 'Needs Corrections' },
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

export default function TravelModule() {
  const { travelRequests, currentUser, can, scope } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const scoped = useMemo(() => {
    const travelScope = scope('travel');
    return travelRequests.filter((tr) => {
      if (travelScope === 'own') return tr.requesterId === currentUser.id;
      if (travelScope === 'department') return tr.department === currentUser.department;
      return true;
    });
  }, [travelRequests, scope, currentUser]);

  const filtered = scoped.filter((tr) => {
    if (statusFilter !== 'all' && tr.status !== statusFilter) return false;
    if (query && !`${tr.destination} ${tr.requesterName} ${tr.id}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = STATUS_FILTERS.map((f) => ({ ...f, count: f.key === 'all' ? scoped.length : scoped.filter((tr) => tr.status === f.key).length }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Travel Management</h1>
          <p className="page-subtitle">Six-stage approval chain — HOD → Travel Office → Bookkeeper → Finance Manager → CEO → Board Treasurer, then expenses & reimbursement</p>
        </div>
        {can('travel', 'create') && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> New Travel Request</button>
        )}
      </div>

      <div className="tabs">
        {counts.map((f) => (
          <button key={f.key} className={`tab-btn ${statusFilter === f.key ? 'active' : ''}`} onClick={() => setStatusFilter(f.key)}>
            {f.label} {f.count > 0 && <span style={{ color: 'var(--text-faint)' }}>({f.count})</span>}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input className="input" placeholder="Search destination, requester, or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={Plane} title="No travel requests found" subtitle="Try adjusting your filters, or submit a new request." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Requester</th><th>Destination</th><th>Dates</th><th>Est. Cost</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tr) => (
                  <tr key={tr.id}>
                    <td className="cell-mono cell-muted">{tr.id}</td>
                    <td>{tr.requesterName}</td>
                    <td>
                      <button className="row-link" onClick={() => setSelected(tr.id)}>{tr.destination}</button>
                    </td>
                    <td className="cell-muted">{formatDate(tr.startDate)} – {formatDate(tr.endDate)}</td>
                    <td className="cell-mono">{money(tr.estimatedCost)}</td>
                    <td><StatusBadge status={tr.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(tr.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <TravelRequestForm open={showForm} onClose={() => setShowForm(false)} />}
      {selected && <TravelDetail requestId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
