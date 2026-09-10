import { useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';

export default function ProjectManagement() {
  const { projects, addProject, toggleProjectActive } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', department: '' });

  function submit(e) {
    e.preventDefault();
    if (!form.name) return;
    addProject(form);
    setForm({ name: '', code: '', department: '' });
    setShowForm(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">The projects staff can allocate Travel Requests (and, in future, other requests) against</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add Project</button>
      </div>

      <div className="card">
        {projects.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 10px' }}>No projects yet — add one to make it available on the Travel Request form.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Project</th><th>Code</th><th>Department</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 650 }}>{p.name}</td>
                    <td className="cell-mono cell-muted">{p.code || '—'}</td>
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
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Project" subtitle="Make a new project available to allocate travel and (in future) other requests against" footer={
        <><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" form="project-form" type="submit">Create Project</button></>
      }>
        <form id="project-form" onSubmit={submit}>
          <div className="field"><label>Project Name *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Early Childhood Development Programme" /></div>
          <div className="field-row">
            <div className="field"><label>Code</label><input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. ECD-2026" /></div>
            <div className="field"><label>Department</label><input className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
