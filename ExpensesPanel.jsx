import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../data/permissions';
import { money, formatDate } from '../../utils/format';
import TravelDetail from '../travel/TravelDetail';

export default function ExpensesPanel() {
  const { travelRequests, role, currentUser } = useApp();
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => {
    const scoped = travelRequests.filter((tr) => {
      if (role === ROLES.STAFF) return tr.requesterId === currentUser.id;
      if (role === ROLES.PROGRAM_MANAGER) return tr.department === currentUser.department;
      return true;
    });
    const flat = [];
    scoped.forEach((tr) => tr.expenses.forEach((e) => flat.push({ ...e, travelId: tr.id, requesterName: tr.requesterName, destination: tr.destination })));
    return flat.sort((a, b) => (a.submittedDate < b.submittedDate ? 1 : -1));
  }, [travelRequests, role, currentUser]);

  return (
    <div>
      <p className="page-subtitle" style={{ margin: '0 0 12px' }}>Expense tracking, linked to travel requests and receipts</p>
      <div className="card">
        {rows.length === 0 ? <EmptyState icon={Receipt} title="No expenses submitted yet" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Travel Request</th><th>Requester</th><th>Category</th><th>Description</th><th>Amount</th><th>Submitted</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td><button className="row-link" onClick={() => setSelected(e.travelId)}>{e.travelId}</button><div className="cell-muted" style={{ fontSize: 11.5 }}>{e.destination}</div></td>
                    <td>{e.requesterName}</td>
                    <td className="cell-muted">{e.category}</td>
                    <td className="cell-muted">{e.description}</td>
                    <td className="cell-mono">{money(e.amount)}</td>
                    <td className="cell-muted">{formatDate(e.submittedDate)}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && <TravelDetail requestId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
