import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { money, formatDate } from '../../utils/format';

export default function InvoicesPanel() {
  const { invoices, budgets, can, submitInvoice, approveInvoiceLevel1, approveInvoiceLevel2, role, currentUser } = useApp();
  const scoped = role === 'program_manager' ? invoices.filter((i) => i.submittedBy === currentUser.name || i.budgetId && budgets.find(b=>b.id===i.budgetId)?.department === currentUser.department) : invoices;
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ vendor: '', description: '', category: 'Operations', amount: '', budgetId: budgets[0]?.id || '' });

  function submit(e) {
    e.preventDefault();
    if (!form.vendor || !form.amount || !form.budgetId) return;
    submitInvoice({ ...form, amount: Number(form.amount) });
    setForm({ vendor: '', description: '', category: 'Operations', amount: '', budgetId: budgets[0]?.id || '' });
    setShowForm(false);
  }

  const sel = invoices.find((i) => i.id === selected);

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="page-subtitle" style={{ margin: 0 }}>Invoice processing & two-tier payment approval</p>
        {can('finance', 'createInvoice') && <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> Submit Invoice</button>}
      </div>
      <div className="card">
        {scoped.length === 0 ? <EmptyState icon={FileText} title="No invoices found" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {scoped.map((inv) => (
                  <tr key={inv.id}>
                    <td className="cell-mono cell-muted">{inv.id}</td>
                    <td><button className="row-link" onClick={() => setSelected(inv.id)}>{inv.vendor}</button></td>
                    <td className="cell-muted">{inv.category}</td>
                    <td className="cell-mono">{money(inv.amount)}</td>
                    <td className="cell-muted">{formatDate(inv.submittedDate)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(inv.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Submit Invoice" subtitle="Route through Level 1 → Level 2 payment approval" footer={
        <><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" form="invoice-form" type="submit">Submit</button></>
      }>
        <form id="invoice-form" onSubmit={submit}>
          <div className="field"><label>Vendor *</label><input className="input" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} /></div>
          <div className="field"><label>Description</label><input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="field-row">
            <div className="field"><label>Amount (ZAR) *</label><input type="number" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div className="field"><label>Budget Line *</label>
              <select className="input" value={form.budgetId} onChange={(e) => setForm((f) => ({ ...f, budgetId: e.target.value }))}>
                {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {sel && (
        <Modal open onClose={() => setSelected(null)} title={`${sel.id} — ${sel.vendor}`} subtitle={sel.description}>
          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Amount</span><span className="v">{money(sel.amount)}</span></div>
            <div className="kv-row"><span className="k">Category</span><span className="v">{sel.category}</span></div>
            <div className="kv-row"><span className="k">Submitted by</span><span className="v">{sel.submittedBy}</span></div>
            <div className="kv-row"><span className="k">Submitted</span><span className="v">{formatDate(sel.submittedDate)}</span></div>
            {sel.linkedTravelRequestId && <div className="kv-row"><span className="k">Linked Travel Request</span><span className="v">{sel.linkedTravelRequestId}</span></div>}
            <div className="kv-row"><span className="k">Status</span><span className="v"><StatusBadge status={sel.status} /></span></div>
          </div>

          <div className="section-title">Payment Approval Chain</div>
          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Level 1 — {sel.level1.approverName}</span><span className="v"><StatusBadge status={sel.level1.status} /></span></div>
            {sel.level1.comment && <div className="hint">{sel.level1.comment}</div>}
            <div className="kv-row"><span className="k">Level 2 — {sel.level2.approverName}</span><span className="v"><StatusBadge status={sel.level2.status} /></span></div>
            {sel.level2.comment && <div className="hint">{sel.level2.comment}</div>}
          </div>

          {can('finance', 'approveLevel1') && sel.status === 'pending_level1' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={() => { approveInvoiceLevel1(sel.id, true, ''); setSelected(null); }}>Approve (Level 1)</button>
              <button className="btn btn-danger btn-block" onClick={() => { approveInvoiceLevel1(sel.id, false, 'Rejected at Level 1 review.'); setSelected(null); }}>Reject</button>
            </div>
          )}
          {can('finance', 'approveLevel2') && sel.status === 'pending_level2' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-block" onClick={() => { approveInvoiceLevel2(sel.id, true, ''); setSelected(null); }}>Approve & Release Payment</button>
              <button className="btn btn-danger btn-block" onClick={() => { approveInvoiceLevel2(sel.id, false, 'Rejected at Level 2 review.'); setSelected(null); }}>Reject</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
