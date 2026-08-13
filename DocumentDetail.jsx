import { useState } from 'react';
import { CheckCircle2, XCircle, Archive, History, ShieldCheck, ShieldAlert, Paperclip, UploadCloud } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../data/permissions';
import { formatDate } from '../../utils/format';

export default function DocumentDetail({ docId, onClose }) {
  const { documents, can, reviewDocument, archiveDocument, addDocumentVersion, currentUser } = useApp();
  const doc = documents.find((d) => d.id === docId);
  const [comment, setComment] = useState('');
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionForm, setVersionForm] = useState({ fileName: '', changeSummary: '' });

  if (!doc) return null;

  const checklist = [
    { label: 'Title & metadata complete', pass: Boolean(doc.title && doc.type && doc.owner) },
    { label: 'Retention date set', pass: Boolean(doc.retentionDate) },
    { label: 'Owner assigned', pass: Boolean(doc.owner) },
    { label: 'Reviewed & approved', pass: doc.status === 'approved' || doc.status === 'archived' },
  ];
  const compliancePass = checklist.every((c) => c.pass);

  return (
    <Modal open onClose={onClose} size="lg" title={doc.title} subtitle={`${doc.id} · ${doc.type} · Owned by ${doc.owner}`}>
      <div className="grid grid-2" style={{ alignItems: 'start', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <StatusBadge status={doc.status} />
            <span className={`badge ${compliancePass ? 'badge-green' : 'badge-amber'}`}>
              {compliancePass ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />} {compliancePass ? 'Compliance Verified' : 'Compliance Pending'}
            </span>
          </div>

          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Uploaded by</span><span className="v">{doc.uploadedBy}</span></div>
            <div className="kv-row"><span className="k">Upload date</span><span className="v">{formatDate(doc.uploadDate)}</span></div>
            <div className="kv-row"><span className="k">Current version</span><span className="v">v{doc.currentVersion}</span></div>
            <div className="kv-row"><span className="k">Retention until</span><span className="v">{formatDate(doc.retentionDate)}</span></div>
          </div>

          <div className="section-title">Compliance Checklist</div>
          <div className="kv-list" style={{ marginBottom: 16 }}>
            {checklist.map((c) => (
              <div className="kv-row" key={c.label}>
                <span className="k" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.pass ? <CheckCircle2 size={13} color="var(--green)" /> : <XCircle size={13} color="var(--amber)" />} {c.label}
                </span>
              </div>
            ))}
          </div>

          <div className="section-title">Visible To</div>
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {doc.viewRoles.map((r) => <span key={r} className="role-chip">{ROLE_LABELS[r]}</span>)}
          </div>

          {doc.reviewNote && (
            <div className="timeline-comment" style={{ marginBottom: 10 }}><strong>Review note:</strong> {doc.reviewNote}</div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-header" style={{ padding: '12px 16px' }}><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={15} /> Version History</h3></div>
            <div style={{ padding: '4px 16px 12px' }}>
              {[...doc.versions].reverse().map((v) => (
                <div className="doc-version-item" key={v.version}>
                  <div className="version-badge">v{v.version}</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 650 }}>{v.fileName}</div>
                    <div className="cell-muted" style={{ fontSize: 11.5 }}>{v.uploadedBy} · {formatDate(v.date)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{v.changeSummary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {doc.status !== 'archived' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header" style={{ padding: '12px 16px' }}><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={15} /> New Version</h3></div>
              <div style={{ padding: 16 }}>
                {!showVersionForm ? (
                  <button className="btn btn-secondary btn-block" onClick={() => setShowVersionForm(true)}>Upload New Version</button>
                ) : (
                  <>
                    <label className="file-drop" style={{ display: 'block', marginBottom: 10 }}>
                      <Paperclip size={14} /><br />
                      {versionForm.fileName || 'Click to attach updated file'}
                      <input type="file" style={{ display: 'none' }} onChange={(e) => setVersionForm((f) => ({ ...f, fileName: e.target.files?.[0]?.name || 'document_v2.pdf' }))} />
                    </label>
                    <textarea className="input" placeholder="Summary of changes" value={versionForm.changeSummary} onChange={(e) => setVersionForm((f) => ({ ...f, changeSummary: e.target.value }))} style={{ marginBottom: 10 }} />
                    <button className="btn btn-primary btn-block" disabled={!versionForm.fileName}
                      onClick={() => { addDocumentVersion(doc.id, versionForm); setVersionForm({ fileName: '', changeSummary: '' }); setShowVersionForm(false); }}>
                      Save New Version
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {can('documents', 'approve') && doc.status === 'pending_review' && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header" style={{ padding: '12px 16px' }}><h3>Review & Approve</h3></div>
              <div style={{ padding: 16 }}>
                <textarea className="input" placeholder="Comment (required if rejecting)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-block" onClick={() => { reviewDocument(doc.id, true, comment); setComment(''); }}>Approve</button>
                  <button className="btn btn-danger btn-block" onClick={() => { reviewDocument(doc.id, false, comment || 'Returned for revision.'); setComment(''); }}>Reject</button>
                </div>
              </div>
            </div>
          )}

          {can('documents', 'archive') && doc.status !== 'archived' && (
            <button className="btn btn-secondary btn-block" onClick={() => archiveDocument(doc.id)}><Archive size={14} /> Archive Document</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
