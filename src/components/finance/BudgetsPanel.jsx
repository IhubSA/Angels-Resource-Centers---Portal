import { useMemo, useState } from 'react';
import { Plus, Pencil, FolderPlus, Settings } from 'lucide-react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { money, pct } from '../../utils/format';

const BLANK_LINE_ITEM = { name: '', allocated: '' };

export default function BudgetsPanel() {
  const { budgets, projects, createBudget, addBudgetLineItem, updateBudgetGroup, adjustBudgetAllocation, can, currentUser, scope } = useApp();
  const financeScope = scope('finance');
  const scoped = financeScope === 'own' || financeScope === 'department'
    ? budgets.filter((b) => b.department === currentUser.department)
    : budgets;
  const activeProjects = projects.filter((p) => p.active);

  const groups = useMemo(() => {
    const byGroup = new Map();
    scoped.forEach((b) => {
      if (!byGroup.has(b.groupId)) byGroup.set(b.groupId, []);
      byGroup.get(b.groupId).push(b);
    });
    return Array.from(byGroup.values()).map((items) => ({
      groupId: items[0].groupId,
      groupName: items[0].groupName,
      projectId: items[0].projectId,
      department: items[0].department,
      owner: items[0].owner,
      items,
      allocated: items.reduce((s, i) => s + i.allocated, 0),
      committed: items.reduce((s, i) => s + i.committed, 0),
      spent: items.reduce((s, i) => s + i.spent, 0),
    }));
  }, [scoped]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ groupName: '', projectId: '', department: '', owner: currentUser.name });
  const [lineItems, setLineItems] = useState([{ ...BLANK_LINE_ITEM }]);

  const [editing, setEditing] = useState(null); // a single line item {id, name, allocated, committed, spent}
  const [newAlloc, setNewAlloc] = useState('');

  const [addingTo, setAddingTo] = useState(null); // groupId
  const [newItem, setNewItem] = useState({ ...BLANK_LINE_ITEM });

  const [editingGroup, setEditingGroup] = useState(null); // group object
  const [groupForm, setGroupForm] = useState({ projectId: '', department: '', owner: '' });

  function updateLineItem(i, field, value) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, [field]: value } : li)));
  }
  function addLineItemRow() { setLineItems((prev) => [...prev, { ...BLANK_LINE_ITEM }]); }
  function removeLineItemRow(i) { setLineItems((prev) => prev.filter((_, idx) => idx !== i)); }

  const lineItemsTotal = lineItems.reduce((s, li) => s + (Number(li.allocated) || 0), 0);
  const canCreate = createForm.groupName && lineItems.length > 0 && lineItems.every((li) => li.name && li.allocated !== '');

  function submitCreate(e) {
    e.preventDefault();
    if (!canCreate) return;
    createBudget({
      groupName: createForm.groupName, projectId: createForm.projectId,
      department: createForm.department || currentUser.department, owner: createForm.owner, fiscalYear: 'FY2026',
      lineItems: lineItems.map((li) => ({ name: li.name, allocated: Number(li.allocated) })),
    });
    setCreateForm({ groupName: '', projectId: '', department: '', owner: currentUser.name });
    setLineItems([{ ...BLANK_LINE_ITEM }]);
    setShowCreate(false);
  }

  function submitAddItem(e) {
    e.preventDefault();
    if (!newItem.name || newItem.allocated === '') return;
    addBudgetLineItem(addingTo, { name: newItem.name, allocated: Number(newItem.allocated) });
    setNewItem({ ...BLANK_LINE_ITEM });
    setAddingTo(null);
  }

  function openEditGroup(group) {
    setEditingGroup(group);
    setGroupForm({ projectId: group.projectId || '', department: group.department || '', owner: group.owner || '' });
  }
  function submitEditGroup(e) {
    e.preventDefault();
    updateBudgetGroup(editingGroup.groupId, groupForm);
    setEditingGroup(null);
  }

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <p className="page-subtitle" style={{ margin: 0 }}>Budget creation, allocation & real-time availability — grouped by budget, broken down into named line items</p>
        {can('finance', 'manageBudgets') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Create Budget</button>}
      </div>

      {groups.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="No budgets yet" /></div>
      ) : groups.map((group) => {
        const project = projects.find((p) => p.id === group.projectId);
        const available = group.allocated - group.committed - group.spent;
        return (
          <div className="card" key={group.groupId} style={{ marginBottom: 14 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{group.groupName}</h3>
                <div className="cell-muted" style={{ fontSize: 11.5 }}>
                  {project ? project.name : 'No project linked'} · {group.department} · {group.owner}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{money(group.allocated)} allocated</div>
                  <div className="cell-muted" style={{ fontSize: 11.5, color: available < 0 ? 'var(--red)' : undefined }}>{money(available)} available</div>
                </div>
                {can('finance', 'manageBudgets') && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAddingTo(group.groupId); setNewItem({ ...BLANK_LINE_ITEM }); }}><FolderPlus size={13} /> Line Item</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditGroup(group)}><Settings size={13} /></button>
                  </div>
                )}
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Line Item</th><th>Allocated</th><th>Committed</th><th>Spent</th><th>Available</th><th></th></tr></thead>
                <tbody>
                  {group.items.map((b) => {
                    const itemAvailable = b.allocated - b.committed - b.spent;
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.name}</div>
                          <div style={{ width: 140, marginTop: 6 }}>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${pct(b.spent, b.allocated)}%`, background: 'var(--brand)' }} />
                              <div className="progress-fill" style={{ width: `${pct(b.committed, b.allocated)}%`, background: 'var(--amber)' }} />
                            </div>
                          </div>
                        </td>
                        <td className="cell-mono">{money(b.allocated)}</td>
                        <td className="cell-mono">{money(b.committed)}</td>
                        <td className="cell-mono">{money(b.spent)}</td>
                        <td className="cell-mono" style={{ color: itemAvailable < 0 ? 'var(--red)' : 'inherit', fontWeight: 650 }}>{money(itemAvailable)}</td>
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
          </div>
        );
      })}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Budget" subtitle="Allocate a new budget for FY2026, split into as many named line items as you need" footer={
        <><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" form="create-budget-form" type="submit" disabled={!canCreate}>Create</button></>
      }>
        <form id="create-budget-form" onSubmit={submitCreate}>
          <div className="field"><label>Budget Name *</label><input className="input" value={createForm.groupName} onChange={(e) => setCreateForm((f) => ({ ...f, groupName: e.target.value }))} placeholder="e.g. Programs Travel & Field Visits FY2026" /></div>
          <div className="field-row">
            <div className="field"><label>Project</label>
              <select className="input" value={createForm.projectId} onChange={(e) => setCreateForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">No project link</option>
                {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Department</label><input className="input" value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} placeholder={currentUser.department} /></div>
          </div>
          <div className="field"><label>Owner</label><input className="input" value={createForm.owner} onChange={(e) => setCreateForm((f) => ({ ...f, owner: e.target.value }))} /></div>

          <div className="field">
            <label>Line Items * — name your own (e.g. Travel, Training, Meetings)</label>
            {lineItems.map((li, i) => (
              <div className="field-row" key={i} style={{ marginBottom: 6 }}>
                <input className="input" value={li.name} onChange={(e) => updateLineItem(i, 'name', e.target.value)} placeholder="Line item name" />
                <input type="number" min="0" className="input" style={{ maxWidth: 160 }} value={li.allocated} onChange={(e) => updateLineItem(i, 'allocated', e.target.value)} placeholder="Amount (ZAR)" />
                {lineItems.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLineItemRow(i)}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItemRow}><Plus size={13} /> Add Line Item</button>
          </div>
          <p className="hint">Total allocated across all line items: <strong>{money(lineItemsTotal)}</strong></p>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Adjust Allocation" subtitle={editing?.name} footer={
        <><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { adjustBudgetAllocation(editing.id, Number(newAlloc)); setEditing(null); }}>Save</button></>
      }>
        <div className="field"><label>Allocated Amount (ZAR)</label><input type="number" className="input" value={newAlloc} onChange={(e) => setNewAlloc(e.target.value)} /></div>
        {editing && <p className="hint">Currently committed: {money(editing.committed)} · spent: {money(editing.spent)}</p>}
      </Modal>

      <Modal open={!!addingTo} onClose={() => setAddingTo(null)} title="Add Line Item" subtitle="Adds a new line item to this budget" footer={
        <><button className="btn btn-secondary" onClick={() => setAddingTo(null)}>Cancel</button><button className="btn btn-primary" form="add-item-form" type="submit">Add</button></>
      }>
        <form id="add-item-form" onSubmit={submitAddItem}>
          <div className="field"><label>Line Item Name *</label><input className="input" value={newItem.name} onChange={(e) => setNewItem((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Meetings" /></div>
          <div className="field"><label>Allocated Amount (ZAR) *</label><input type="number" min="0" className="input" value={newItem.allocated} onChange={(e) => setNewItem((f) => ({ ...f, allocated: e.target.value }))} /></div>
        </form>
      </Modal>

      <Modal open={!!editingGroup} onClose={() => setEditingGroup(null)} title="Budget Settings" subtitle={editingGroup?.groupName} footer={
        <><button className="btn btn-secondary" onClick={() => setEditingGroup(null)}>Cancel</button><button className="btn btn-primary" form="edit-group-form" type="submit">Save</button></>
      }>
        <form id="edit-group-form" onSubmit={submitEditGroup}>
          <div className="field"><label>Project</label>
            <select className="input" value={groupForm.projectId} onChange={(e) => setGroupForm((f) => ({ ...f, projectId: e.target.value }))}>
              <option value="">No project link</option>
              {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label>Department</label><input className="input" value={groupForm.department} onChange={(e) => setGroupForm((f) => ({ ...f, department: e.target.value }))} /></div>
            <div className="field"><label>Owner</label><input className="input" value={groupForm.owner} onChange={(e) => setGroupForm((f) => ({ ...f, owner: e.target.value }))} /></div>
          </div>
          <p className="hint">Applies to all {editingGroup?.items.length} line item{editingGroup?.items.length === 1 ? '' : 's'} in this budget.</p>
        </form>
      </Modal>
    </div>
  );
}
