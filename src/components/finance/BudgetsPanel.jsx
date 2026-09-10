import { useMemo, useState } from 'react';
import { Plus, Pencil, FolderPlus, Settings } from 'lucide-react';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { money, pct } from '../../utils/format';

const BLANK_LINE_ITEM = { name: '', allocated: '' };
const NEW_MAIN_PROJECT = '__new__';

// Toggle-able tag list for picking one or more Cost Codes (Projects) under a Budget — a
// Budget can draw against more than one Cost Code at once, e.g. a programme spanning two
// funding-year codes (added 2026-09-10, replacing the old single "Project" dropdown).
function CostCodePicker({ options, selectedIds, onToggle }) {
  if (options.length === 0) {
    return <p className="hint" style={{ margin: '4px 0 0' }}>No Projects to choose from yet — add some under Projects first.</p>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {options.map((p) => {
        const active = selectedIds.includes(p.id);
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={active ? 'badge badge-blue' : 'badge badge-slate'}
            style={{ cursor: 'pointer', border: active ? '1px solid var(--blue)' : '1px solid var(--border)' }}
            title={p.code || p.name}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

export default function BudgetsPanel() {
  const { budgets, projects, mainProjects, addMainProject, createBudget, addBudgetLineItem, updateBudgetGroup, adjustBudgetAllocation, can, currentUser, scope } = useApp();
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
      mainProjectId: items[0].mainProjectId,
      costCodeIds: items[0].costCodeIds && items[0].costCodeIds.length > 0 ? items[0].costCodeIds : (items[0].projectId ? [items[0].projectId] : []),
      department: items[0].department,
      owner: items[0].owner,
      items,
      allocated: items.reduce((s, i) => s + i.allocated, 0),
      committed: items.reduce((s, i) => s + i.committed, 0),
      spent: items.reduce((s, i) => s + i.spent, 0),
    }));
  }, [scoped]);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ groupName: '', mainProjectId: '', costCodeIds: [], department: '', owner: currentUser.name });
  const [nameAutoFilled, setNameAutoFilled] = useState(true);
  const [newMainProjectName, setNewMainProjectName] = useState('');
  const [lineItems, setLineItems] = useState([{ ...BLANK_LINE_ITEM }]);

  const [editing, setEditing] = useState(null); // a single line item {id, name, allocated, committed, spent}
  const [newAlloc, setNewAlloc] = useState('');

  const [addingTo, setAddingTo] = useState(null); // groupId
  const [newItem, setNewItem] = useState({ ...BLANK_LINE_ITEM });

  const [editingGroup, setEditingGroup] = useState(null); // group object
  const [groupForm, setGroupForm] = useState({ mainProjectId: '', costCodeIds: [], department: '', owner: '' });
  const [editNewMainProjectName, setEditNewMainProjectName] = useState('');

  // Cost Code choices narrow to the selected Main Project's Projects once one is picked;
  // otherwise every active Project is offered (matches the old "no project link" flexibility).
  const costCodeOptionsFor = (mainProjectId) => (mainProjectId ? activeProjects.filter((p) => p.mainProjectId === mainProjectId) : activeProjects);

  function handleMainProjectChange(value) {
    if (value === NEW_MAIN_PROJECT) {
      setCreateForm((f) => ({ ...f, mainProjectId: NEW_MAIN_PROJECT, costCodeIds: [] }));
      return;
    }
    const mp = mainProjects.find((m) => m.id === value);
    setCreateForm((f) => ({
      ...f,
      mainProjectId: value,
      costCodeIds: [],
      groupName: nameAutoFilled ? (mp?.name || '') : f.groupName,
    }));
  }

  function toggleCostCode(id) {
    setCreateForm((f) => ({ ...f, costCodeIds: f.costCodeIds.includes(id) ? f.costCodeIds.filter((x) => x !== id) : [...f.costCodeIds, id] }));
  }

  function updateLineItem(i, field, value) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, [field]: value } : li)));
  }
  function addLineItemRow() { setLineItems((prev) => [...prev, { ...BLANK_LINE_ITEM }]); }
  function removeLineItemRow(i) { setLineItems((prev) => prev.filter((_, idx) => idx !== i)); }

  const lineItemsTotal = lineItems.reduce((s, li) => s + (Number(li.allocated) || 0), 0);
  const canCreate = createForm.groupName && lineItems.length > 0 && lineItems.every((li) => li.name && li.allocated !== '')
    && (createForm.mainProjectId !== NEW_MAIN_PROJECT || newMainProjectName.trim());

  function submitCreate(e) {
    e.preventDefault();
    if (!canCreate) return;
    let mainProjectId = createForm.mainProjectId;
    if (mainProjectId === NEW_MAIN_PROJECT) {
      if (!newMainProjectName.trim()) return;
      mainProjectId = addMainProject(newMainProjectName.trim()).id;
    }
    createBudget({
      groupName: createForm.groupName, mainProjectId, costCodeIds: createForm.costCodeIds,
      department: createForm.department || currentUser.department, owner: createForm.owner, fiscalYear: 'FY2026',
      lineItems: lineItems.map((li) => ({ name: li.name, allocated: Number(li.allocated) })),
    });
    setCreateForm({ groupName: '', mainProjectId: '', costCodeIds: [], department: '', owner: currentUser.name });
    setNewMainProjectName('');
    setNameAutoFilled(true);
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
    setGroupForm({ mainProjectId: group.mainProjectId || '', costCodeIds: group.costCodeIds || [], department: group.department || '', owner: group.owner || '' });
    setEditNewMainProjectName('');
  }
  function handleGroupMainProjectChange(value) {
    setGroupForm((f) => ({ ...f, mainProjectId: value, costCodeIds: [] }));
  }
  function toggleGroupCostCode(id) {
    setGroupForm((f) => ({ ...f, costCodeIds: f.costCodeIds.includes(id) ? f.costCodeIds.filter((x) => x !== id) : [...f.costCodeIds, id] }));
  }
  function submitEditGroup(e) {
    e.preventDefault();
    let mainProjectId = groupForm.mainProjectId;
    if (mainProjectId === NEW_MAIN_PROJECT) {
      if (!editNewMainProjectName.trim()) return;
      mainProjectId = addMainProject(editNewMainProjectName.trim()).id;
    }
    updateBudgetGroup(editingGroup.groupId, { ...groupForm, mainProjectId });
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
        const mainProject = mainProjects.find((mp) => mp.id === group.mainProjectId);
        const costCodeNames = group.costCodeIds.map((id) => projects.find((p) => p.id === id)?.name).filter(Boolean);
        const available = group.allocated - group.committed - group.spent;
        return (
          <div className="card" key={group.groupId} style={{ marginBottom: 14 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{group.groupName}</h3>
                <div className="cell-muted" style={{ fontSize: 11.5 }}>
                  {mainProject ? mainProject.name : 'No Main Project'}
                  {costCodeNames.length > 0 && ` — ${costCodeNames.join(', ')}`}
                  {' · '}{group.department} · {group.owner}
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
          <div className="field">
            <label>Main Project (client / programme)</label>
            <select className="input" value={createForm.mainProjectId} onChange={(e) => handleMainProjectChange(e.target.value)}>
              <option value="">No Main Project</option>
              {mainProjects.map((mp) => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
              <option value={NEW_MAIN_PROJECT}>+ New Main Project…</option>
            </select>
            {createForm.mainProjectId === NEW_MAIN_PROJECT && (
              <input className="input" style={{ marginTop: 8 }} value={newMainProjectName} onChange={(e) => {
                setNewMainProjectName(e.target.value);
                if (nameAutoFilled) setCreateForm((f) => ({ ...f, groupName: e.target.value }));
              }} placeholder="e.g. Anthem" />
            )}
          </div>
          <div className="field">
            <label>Budget Name *</label>
            <input className="input" value={createForm.groupName} onChange={(e) => { setNameAutoFilled(false); setCreateForm((f) => ({ ...f, groupName: e.target.value })); }} placeholder="e.g. Programs Travel & Field Visits FY2026" />
            <p className="hint" style={{ margin: '4px 0 0' }}>Defaults to the Main Project's name — edit freely if you want something different (e.g. add a fiscal year).</p>
          </div>
          <div className="field">
            <label>Cost Code(s) — which Project(s) this budget is allocated against</label>
            <CostCodePicker options={costCodeOptionsFor(createForm.mainProjectId === NEW_MAIN_PROJECT ? '' : createForm.mainProjectId)} selectedIds={createForm.costCodeIds} onToggle={toggleCostCode} />
          </div>
          <div className="field-row">
            <div className="field"><label>Department</label><input className="input" value={createForm.department} onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))} placeholder={currentUser.department} /></div>
            <div className="field"><label>Owner</label><input className="input" value={createForm.owner} onChange={(e) => setCreateForm((f) => ({ ...f, owner: e.target.value }))} /></div>
          </div>

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
          <div className="field">
            <label>Main Project (client / programme)</label>
            <select className="input" value={groupForm.mainProjectId} onChange={(e) => handleGroupMainProjectChange(e.target.value)}>
              <option value="">No Main Project</option>
              {mainProjects.map((mp) => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
              <option value={NEW_MAIN_PROJECT}>+ New Main Project…</option>
            </select>
            {groupForm.mainProjectId === NEW_MAIN_PROJECT && (
              <input className="input" style={{ marginTop: 8 }} value={editNewMainProjectName} onChange={(e) => setEditNewMainProjectName(e.target.value)} placeholder="e.g. Anthem" />
            )}
          </div>
          <div className="field">
            <label>Cost Code(s) — which Project(s) this budget is allocated against</label>
            <CostCodePicker options={costCodeOptionsFor(groupForm.mainProjectId === NEW_MAIN_PROJECT ? '' : groupForm.mainProjectId)} selectedIds={groupForm.costCodeIds} onToggle={toggleGroupCostCode} />
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
