import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { ROLES, ROLE_LABELS } from '../../data/permissions';

const TYPES = ['Policy', 'Report', 'Template', 'Compliance', 'Minutes', 'Contract', 'Other'];
const ALL_ROLES = Object.values(ROLES);

export default function DocumentUploadForm({ open, onClose }) {
  const { uploadDocument, currentUser } = useApp();
  const [form, setForm] = useState({ title: '', type: 'Report', owner: currentUser.name, retentionDate: '', fileName: '' });
  const [viewRoles, setViewRoles] = useState(ALL_ROLES);

  function toggleRole(r) {
    setViewRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title || !form.fileName) return;
    uploadDocument({ ...form, viewRoles, editRoles: ['admin', currentUser.role] });
    setForm({ title: '', type: 'Report', owner: currentUser.name, retentionDate: '', fileName: '' });
    setViewRoles(ALL_ROLES);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload Document" subtitle="Add metadata — routed for review automatically" footer={
      <><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="doc-upload-form" type="submit">Upload</button></>
    }>
      <form id="doc-upload-form" onSubmit={submit}>
        <div className="field"><label>Title *</label><input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
        <div className="field-row">
          <div className="field"><label>Document Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>Owner</label><input className="input" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} /></div>
        </div>
        <div className="field"><label>Retention Date</label><input type="date" className="input" value={form.retentionDate} onChange={(e) => setForm((f) => ({ ...f, retentionDate: e.target.value }))} /></div>
        <div className="field">
          <label>File</label>
          <label className="file-drop" style={{ display: 'block' }}>
            <Paperclip size={15} /><br />
            {form.fileName ? form.fileName : 'Click to attach a file (demo — no real upload)'}
            <input type="file" style={{ display: 'none' }} onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.files?.[0]?.name || 'document.pdf' }))} />
          </label>
        </div>
        <div className="field">
          <label>Visible to Roles</label>
          <div className="chip-row">
            {ALL_ROLES.map((r) => (
              <button type="button" key={r} className={`badge ${viewRoles.includes(r) ? 'badge-green' : 'badge-slate'}`} onClick={() => toggleRole(r)} style={{ cursor: 'pointer', border: 'none' }}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <span className="hint">Click to toggle role-based view access for this document.</span>
        </div>
      </form>
    </Modal>
  );
}
