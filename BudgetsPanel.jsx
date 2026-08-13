import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { money, pct } from '../../utils/format';

const CATEGORIES = ['Travel', 'Operations', 'Programs', 'Training'];

export default function BudgetsPanel() {
  const { budgets, createBudget, adjustBudgetAllocation, can, currentUser, role } = useApp();
  const scoped = role === 'program_manager' ? budgets.filter((b) => b.department === currentUser.department) : budgets;
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Programs', department: '', owner: currentUser.name, allocated: '' });
  const [newAlloc, setNewAlloc] = useState('');

  function submitCreate(e) {
    e.preventDefault();
    if (!form.name || !form.allocated) return;
    createBudget({ name: form.name, category: form.category, department: form.department || currentUser.department, owner: form.owner, fiscalYear: 'FY2026', allocated: Number(form.allocated) });
    setForm({ name: '', category: 'Programs', department: '', owner: currentUser.name, allocated: '' });
    setShowCreate(false);
  }

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="page-subtitle" style={{ margin: 0 }}>Budget creation, allocation & real-time availability</p>
        {can('finance', 'manageBudgets') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Create Budget</button>}
      </div>
      <div className="card">
        {scoped.length === 0 ? <EmptyState icon={Wallet} title="No budget lines" /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Budget</th><th>Category</th><th>Owner</th><th>Allocated</th><th>Committed</th><th>Spent</th><th>Available</th><th></th></tr></thead>
              <tbody>
                {scoped.map((b) => {
                  const available = b.allocated - b.committed - b.spent;
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{b.name}</div>
                        <div style={{ width: 140, marginTop: 6 }}>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${pct(b.spent, b.allocated)}%`, background: 'var(--brand)' }} />
                            <div className="progress-fill" style={{ width: `${pct(b.committed, b.allocated)}%`, background: 'var(--amber)' }} />
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted">{b.category}</td>
                      <td className="cell-muted">{b.owner}</td>
                      <td className="cell-mono">{money(b.allocated)}</td>
                      <td className="cell-mono">{money(b.committed)}</td>
                      <td className="cell-mono">{money(b.spent)}</td>
                      <td className="cell-mono" style={{ color: available < 0 ? 'var(--red)' : 'inherit', fontWeight: 650 }}>{money(available)}</td>
                      <td>
                        {can('finance', 'manageBudgets') && (
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(b); setNewAlloc(String(b.allocated)); }}><Pencil size={13} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Budget" subtitle="Allocate a new budget line for FY2026" footer={
        <><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" form="create-budget-form" type="submit">Create</button></>
      }>
        <form id="create-budget-form" onSubmit={submitCreate}>
          <div className="field"><label>Budget Name *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="field-row">
            <div className="field"><label>Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Allocated Amount (ZAR) *</label><input type="number" className="input" value={form.allocated} onChange={(e) => setForm((f) => ({ ...f, allocated: e.target.value }))} /></div>
          </div>
          <div className="field-row">
            <div className="field"><label>Department</label><input className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder={currentUser.department} /></div>
            <div className="field"><label>Owner</label><input className="input" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} /></div>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Adjust Allocation" subtitle={editing?.name} footer={
        <><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { adjustBudgetAllocation(editing.id, Number(newAlloc)); setEditing(null); }}>Save</button></>
      }>
        <div className="field"><label>Allocated Amount (ZAR)</label><input type="number" className="input" value={newAlloc} onChange={(e) => setNewAlloc(e.target.value)} /></div>
        {editing && <p className="hint">Currently committed: {money(editing.committed)} · spent: {money(editing.spent)}</p>}
      </Modal>
    </div>
  );
}
