import { useState } from 'react';
import { Plus, UserCog } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { ROLES, ROLE_LABELS } from '../../data/permissions';
import { initialsOf } from '../../utils/format';

export default function UserManagement() {
  const { users, addUser, updateUserRole, toggleUserActive } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: ROLES.STAFF, department: '', title: '' });

  function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    addUser(form);
    setForm({ name: '', email: '', role: ROLES.STAFF, department: '', title: '' });
    setShowForm(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage accounts, roles and access across the organization</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add User</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>User</th><th>Department</th><th>Title</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{u.initials || initialsOf(u.name)}</div>
                      <div>
                        <div style={{ fontWeight: 650 }}>{u.name}</div>
                        <div className="cell-muted" style={{ fontSize: 11.5 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-muted">{u.department}</td>
                  <td className="cell-muted">{u.title}</td>
                  <td>
                    <select className="input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}>
                      {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td><StatusBadge status={u.active ? 'active' : 'inactive'} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleUserActive(u.id)}>
                      <UserCog size={13} /> {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add User" subtitle="Create a new account and assign a role" footer={
        <><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" form="user-form" type="submit">Create User</button></>
      }>
        <form id="user-form" onSubmit={submit}>
          <div className="field"><label>Full Name *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="field"><label>Email *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div className="field-row">
            <div className="field"><label>Department</label><input className="input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
            <div className="field"><label>Title</label><input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          </div>
          <div className="field">
            <label>Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
