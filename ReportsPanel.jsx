import { FileDown, PieChart, Receipt, FileStack as FileStackIcon, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { money } from '../../utils/format';

function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

function download(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function ReportsPanel() {
  const { budgets, travelRequests, invoices, showToast } = useApp();

  function exportBudgetReport() {
    const rows = budgets.map((b) => ({ id: b.id, name: b.name, category: b.category, department: b.department, allocated: b.allocated, committed: b.committed, spent: b.spent, available: b.allocated - b.committed - b.spent }));
    download('budget_vs_actual_FY2026.csv', toCsv(rows, ['id', 'name', 'category', 'department', 'allocated', 'committed', 'spent', 'available']));
    showToast('Budget vs. Actual report exported');
  }
  function exportExpenseReport() {
    const rows = [];
    travelRequests.forEach((tr) => tr.expenses.forEach((e) => rows.push({ travelId: tr.id, requester: tr.requesterName, category: e.category, description: e.description, amount: e.amount, status: e.status, submitted: e.submittedDate })));
    download('travel_expenses.csv', toCsv(rows, ['travelId', 'requester', 'category', 'description', 'amount', 'status', 'submitted']));
    showToast('Expense report exported');
  }
  function exportInvoiceReport() {
    const rows = invoices.map((i) => ({ id: i.id, vendor: i.vendor, category: i.category, amount: i.amount, status: i.status, submittedBy: i.submittedBy, submitted: i.submittedDate }));
    download('invoices.csv', toCsv(rows, ['id', 'vendor', 'category', 'amount', 'status', 'submittedBy', 'submitted']));
    showToast('Invoice report exported');
  }
  function exportReimbursementReport() {
    const rows = travelRequests.filter((tr) => tr.reimbursement.status !== 'not_applicable').map((tr) => ({ travelId: tr.id, requester: tr.requesterName, destination: tr.destination, amount: tr.reimbursement.amount, status: tr.reimbursement.status, processedDate: tr.reimbursement.processedDate }));
    download('reimbursements.csv', toCsv(rows, ['travelId', 'requester', 'destination', 'amount', 'status', 'processedDate']));
    showToast('Reimbursement report exported');
  }

  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const reports = [
    { icon: Wallet, title: 'Budget vs. Actual Report', desc: `${budgets.length} budget lines · ${money(totalAllocated)} allocated, ${money(totalSpent)} spent`, action: exportBudgetReport },
    { icon: Receipt, title: 'Travel Expense Report', desc: 'All submitted expenses with receipt reference & status', action: exportExpenseReport },
    { icon: FileStackIcon, title: 'Invoice & Payment Report', desc: `${invoices.length} invoices across all approval stages`, action: exportInvoiceReport },
    { icon: PieChart, title: 'Reimbursement Report', desc: 'Processed & pending staff reimbursements', action: exportReimbursementReport },
  ];

  return (
    <div>
      <p className="page-subtitle" style={{ margin: '0 0 12px' }}>Financial reporting with CSV export</p>
      <div className="grid grid-2">
        {reports.map((r) => (
          <div className="card card-pad" key={r.title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="stat-tile-icon" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}><r.icon size={16} /></span>
              <strong style={{ fontSize: 14 }}>{r.title}</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>{r.desc}</p>
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={r.action}><FileDown size={13} /> Export CSV</button>
          </div>
        ))}
      </div>
    </div>
  );
}
