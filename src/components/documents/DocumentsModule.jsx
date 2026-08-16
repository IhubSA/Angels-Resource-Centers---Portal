import { useMemo, useState } from 'react';
import { Plus, Search, FileStack } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLES } from '../../data/permissions';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentDetail from './DocumentDetail';
import { formatDate } from '../../utils/format';

export default function DocumentsModule() {
  const { documents, can, role, currentUser } = useApp();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState(null);

  const visible = useMemo(() => documents.filter((d) => {
    if (role === ROLES.ADMIN || role === ROLES.FINANCE_MANAGER || role === ROLES.AUDITOR) return true;
    if (role === ROLES.STAFF) return d.viewRoles.includes(role) && (d.uploadedBy === currentUser.name || d.viewRoles.includes(ROLES.STAFF));
    return d.viewRoles.includes(role);
  }), [documents, role, currentUser]);

  const types = ['all', ...new Set(documents.map((d) => d.type))];

  const filtered = visible.filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (query && !`${d.title} ${d.owner} ${d.id} ${d.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Document Control</h1>
          <p className="page-subtitle">Upload, review, version, and retain organizational documents</p>
        </div>
        {can('documents', 'upload') && <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Plus size={15} /> Upload Document</button>}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input className="input" placeholder="Search title, owner, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>
        <select className="input" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? <EmptyState icon={FileStack} title="No documents found" subtitle="Try adjusting your filters, or upload a new document." /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Title</th><th>Type</th><th>Owner</th><th>Version</th><th>Updated</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td><button className="row-link" onClick={() => setSelected(d.id)}>{d.title}</button></td>
                    <td className="cell-muted">{d.type}</td>
                    <td className="cell-muted">{d.owner}</td>
                    <td className="cell-mono">v{d.currentVersion}</td>
                    <td className="cell-muted">{formatDate(d.versions[d.versions.length - 1]?.date || d.uploadDate)}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setSelected(d.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && <DocumentUploadForm open={showUpload} onClose={() => setShowUpload(false)} />}
      {selected && <DocumentDetail docId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
