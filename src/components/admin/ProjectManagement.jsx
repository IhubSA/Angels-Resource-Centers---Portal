import { useMemo, useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';

const NEW_MAIN_PROJECT = '__new__';

export default function ProjectManagement() {
  const { projects, addProject, toggleProjectActive, mainProjects, addMainProject, setProjectMainProject } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', department: '', mainProjectId: '' });
  const [newMainProjectName, setNewMainProjectName] = useState('');

  // Group Projects (Cost Codes) under their Main Project (client/programme) for display, e.g.
  // several "Anthem - <Site> - Internship" rows all group under "Anthem" — added 2026-09-10 so
  // Brent can see at a glance which Cost Codes belong to which client/programme.
  const groups = useMemo(() => {
    const byMain = new Map();
    projects.forEach((p) => {
      const key = p.mainProjectId || '';
      if (!byMain.has(key)) byMain.set(key, []);
      byMain.get(key).push(p);
    });
    const ordered = mainProjects
      .filter((mp) => byMain.has(mp.id))
      .map((mp) => ({ id: mp.id, name: mp.name, items: byMain.get(mp.id) }));
    if (byMain.has('')) ordered.push({ id: '', name: 'No Main Project', items: byMain.get('') });
    return ordered;
  }, [projects, mainProjects]);

  function submit(e) {
    e.preventDefault();
    if (!form.name) return;
    if (form.mainProjectId === NEW_MAIN_PROJECT) {
      if (!newMainProjectName.trim()) return;
      const mp = addMainProject(newMainProjectName.trim());
      addProject({ ...form, mainProjectId: mp.id });
    } else {
      addProject(form);
    }
    setForm({ name: '', code: '', department: '', mainProjectId: '' });
    setNewMainProjectName('');
    setShowForm(false);
  }

  function handleRowMainProjectChange(projectId, value) {
    if (value === NEW_MAIN_PROJECT) {
      const name = window.prompt('Name for the new Main Project (e.g. a client or funder name):');
      if (!name || !name.trim()) return;
      const mp = addMainProject(name.trim());
      setProjectMainProject(projectId, mp.id);
    } else {
      setProjectMainProject(projectId, value);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Cost Codes staff can allocate Travel Requests (and Budgets) against, grouped under a Main Project — the client or programme they belong to</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="card"><div className="empty-state" style={{ padding: '30px 10px' }}>No projects yet — add one to make it available on the Travel Request form.</div></div>
      ) : groups.map((group) => (
        <div className="card" key={group.id || 'ungrouped'} style={{ marginBottom: 14 }}>
          <div className="card-header"><h3 style={{ marginBottom: 0 }}>{group.name}</h3></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Project (Cost Code)</th><th>Code</th><th>Main Project</th><th>Department</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {group.items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 650 }}>{p.name}</td>
                    <td className="cell-mono cell-muted">{p.code || '—'}</td>
                    <td>
                      <select className="input" style={{ minWidth: 160 }} value={p.mainProjectId || ''} onChange={(e) => handleRowMainProjectChange(p.id, e.target.value)}>
                        <option value="">No Main Project</option>
                        {mainProjects.map((mp) => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
                        <option value={NEW_MAIN_PROJECT}>+ New Main Project…</option>
                      </select>
                    </td>
                    <td className="cell-muted">{p.department || '—'}</td>
                    <td><StatusBadge status={p.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleProjectActive(p.id)}>
                        <FolderKanban size={13} /> {p.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Project" subtitle="Make a new project (Cost Code) available to allocate travel, budgets, and (in future) other requests against" footer={
        <><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" form="project-form" type="submit">Create Project</button></>
      }>
        <form id="project-form" onSubmit={submit}>
          <div className="field"><label>Project Name *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Early Childhood Development Programme" /></div>
          <div className="field-row">
            <div className="field"><label>Code</label><input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. ECD-2026" /></div>
            <div className="field"><label>Department</label><input className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
          </div>
          <div className="field">
            <label>Main Project (client / programme)</label>
            <select className="input" value={form.mainProjectId} onChange={(e) => setForm((f) => ({ ...f, mainProjectId: e.target.value }))}>
              <option value="">No Main Project</option>
              {mainProjects.map((mp) => <option key={mp.id} value={mp.id}>{mp.name}</option>)}
              <option value={NEW_MAIN_PROJECT}>+ New Main Project…</option>
            </select>
            {form.mainProjectId === NEW_MAIN_PROJECT && (
              <input className="input" style={{ marginTop: 8 }} value={newMainProjectName} onChange={(e) => setNewMainProjectName(e.target.value)} placeholder="e.g. Anthem" />
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
