import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, GraduationCap, HeartHandshake, UserCheck, ClipboardCheck, Calculator, Crown, Banknote, RotateCcw } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { REQUEST_TYPES, procurementRequirementFor } from '../../data/permissions';
import { money, formatDate } from '../../utils/format';

function TimelineIcon({ status }) {
  if (status === 'approved') return <div className="timeline-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><CheckCircle2 size={14} /></div>;
  if (status === 'rejected') return <div className="timeline-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><XCircle size={14} /></div>;
  if (status === 'pending') return <div className="timeline-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><Clock size={14} /></div>;
  return <div className="timeline-icon" style={{ background: 'var(--slate-bg)', color: 'var(--slate)' }}><Clock size={14} /></div>;
}

function ActionCard({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-header" style={{ padding: '12px 16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={15} /> {title}</h3>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

export default function FinanceRequestDetail({ requestId, onClose }) {
  const {
    financeRequests, budgets, can, currentUser,
    edaReview, mentorApprove, lineManagerReview, bookkeeperVerify, accountantReview, financeCeoApprove, processPayment, resubmitFinanceRequest,
  } = useApp();
  const fr = financeRequests.find((f) => f.id === requestId);
  const [comment, setComment] = useState('');
  const [reference, setReference] = useState('');
  const [editForm, setEditForm] = useState(null);

  if (!fr) return null;
  const budget = budgets.find((b) => b.id === fr.budgetId);
  const typeInfo = REQUEST_TYPES.find((rt) => rt.key === fr.requestType);
  const isApr = fr.requestType === 'apr';

  const canEda = can('finance', 'edaReview') && fr.status === 'pending_eda';
  const canMentor = can('finance', 'mentorApprove') && fr.status === 'pending_mentor';
  const canLineManager = can('finance', 'lineManagerReview') && fr.status === 'pending_line_manager';
  const canBookkeeperVerify = can('finance', 'bookkeeperVerify') && fr.status === 'pending_bookkeeper_verification';
  const canAccountant = can('finance', 'accountantReview') && fr.status === 'pending_accountant_review';
  const canCeo = can('finance', 'ceoApprove') && fr.status === 'pending_ceo';
  const canPay = can('finance', 'processPayment') && fr.status === 'pending_payment';
  const canResubmit = fr.submittedById === currentUser.id && String(fr.status || '').startsWith('returned_by_');

  const noActionAvailable = !canEda && !canMentor && !canLineManager && !canBookkeeperVerify && !canAccountant && !canCeo && !canPay && !canResubmit;

  const clearComment = () => setComment('');

  function startEdit() {
    setEditForm({
      vendor: fr.vendor || '', description: fr.description || '', category: fr.category || '', amount: fr.amount,
      budgetId: fr.budgetId || budgets[0]?.id || '', procurementRef: fr.procurementRef || '', beneficiaryDevelopmentPlan: fr.beneficiaryDevelopmentPlan || '',
    });
  }

  function submitEdit(e) {
    e.preventDefault();
    if (!editForm.vendor || !editForm.description || !editForm.amount || !editForm.budgetId) return;
    resubmitFinanceRequest(fr.id, { ...editForm, amount: Number(editForm.amount) });
    setEditForm(null);
  }

  const returnComment = fr.eda?.comment && fr.status === 'returned_by_eda' ? fr.eda.comment
    : fr.mentor?.comment && fr.status === 'returned_by_mentor' ? fr.mentor.comment
    : fr.lineManager?.comment && fr.status === 'returned_by_line_manager' ? fr.lineManager.comment
    : fr.bookkeeperVerification?.comment && fr.status === 'returned_by_bookkeeper' ? fr.bookkeeperVerification.comment
    : fr.accountantReview?.comment && fr.status === 'returned_by_accountant' ? fr.accountantReview.comment
    : fr.ceo?.comment && fr.status === 'returned_by_ceo' ? fr.ceo.comment
    : '';

  return (
    <Modal open onClose={onClose} size="lg" title={`${fr.id} — ${fr.vendor || fr.description}`} subtitle={`${typeInfo?.label || fr.requestType} · Submitted by ${fr.submittedBy} on ${formatDate(fr.submittedDate)}`}>
      <div className="grid grid-2" style={{ alignItems: 'start', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <StatusBadge status={fr.status} />
            <span className="badge badge-slate">{typeInfo?.short || fr.requestType}</span>
            {fr.returnCount > 0 && <span className="badge badge-amber"><RotateCcw size={11} /> Resubmitted ×{fr.returnCount}</span>}
            {returnComment && <span className="badge badge-red"><AlertTriangle size={11} /> Needs corrections</span>}
          </div>

          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Vendor / Payee</span><span className="v">{fr.vendor}</span></div>
            <div className="kv-row"><span className="k">Description</span><span className="v">{fr.description}</span></div>
            <div className="kv-row"><span className="k">Amount</span><span className="v">{money(fr.amount)}</span></div>
            <div className="kv-row"><span className="k">Category</span><span className="v">{fr.category}</span></div>
            <div className="kv-row"><span className="k">Budget Line</span><span className="v">{budget?.name || fr.budgetId}</span></div>
            <div className="kv-row"><span className="k">Procurement (FIN-03)</span><span className="v">{fr.procurementRef || procurementRequirementFor(fr.amount)}</span></div>
            {fr.linkedTravelRequestId && <div className="kv-row"><span className="k">Linked Travel Request</span><span className="v">{fr.linkedTravelRequestId}</span></div>}
            {isApr && <div className="kv-row"><span className="k">Beneficiary Development Plan</span><span className="v">{fr.beneficiaryDevelopmentPlan || '—'}</span></div>}
          </div>

          <div className="section-title">Approval Chain</div>
          <div className="timeline">
            {isApr && (
              <>
                <div className="timeline-step">
                  <TimelineIcon status={fr.eda.status === 'not_applicable' ? 'not_started' : fr.eda.status} />
                  <div>
                    <div className="timeline-title">Entrepreneur Development Advisor {fr.eda.approverName && `(${fr.eda.approverName})`}</div>
                    <div className="timeline-meta">{fr.eda.date ? formatDate(fr.eda.date) : 'Alignment with beneficiary development plan'}</div>
                    {fr.eda.comment && <div className="timeline-comment">{fr.eda.comment}</div>}
                  </div>
                </div>
                <div className="timeline-step">
                  <TimelineIcon status={fr.mentor.status === 'not_applicable' ? 'not_started' : fr.mentor.status} />
                  <div>
                    <div className="timeline-title">Mentor {fr.mentor.approverName && `(${fr.mentor.approverName})`}</div>
                    <div className="timeline-meta">{fr.mentor.date ? formatDate(fr.mentor.date) : (fr.mentor.status === 'not_applicable' ? 'Not yet reached' : 'Mentorship endorsement')}</div>
                    {fr.mentor.comment && <div className="timeline-comment">{fr.mentor.comment}</div>}
                  </div>
                </div>
              </>
            )}
            <div className="timeline-step">
              <TimelineIcon status={fr.lineManager.status === 'not_started' ? 'not_started' : fr.lineManager.status} />
              <div>
                <div className="timeline-title">1. Line Manager {fr.lineManager.approverName && `(${fr.lineManager.approverName})`}</div>
                <div className="timeline-meta">{fr.lineManager.date ? formatDate(fr.lineManager.date) : (fr.lineManager.status === 'not_started' ? 'Not yet reached' : 'Budget availability & business justification')}</div>
                {fr.lineManager.comment && <div className="timeline-comment">{fr.lineManager.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={fr.bookkeeperVerification.status === 'not_started' ? 'not_started' : fr.bookkeeperVerification.status} />
              <div>
                <div className="timeline-title">2. Bookkeeper Verification {fr.bookkeeperVerification.approverName && `(${fr.bookkeeperVerification.approverName})`}</div>
                <div className="timeline-meta">{fr.bookkeeperVerification.date ? formatDate(fr.bookkeeperVerification.date) : (fr.bookkeeperVerification.status === 'not_started' ? 'Not yet reached' : 'Documentation, coding & policy compliance')}</div>
                {fr.bookkeeperVerification.comment && <div className="timeline-comment">{fr.bookkeeperVerification.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={fr.accountantReview.status === 'not_started' ? 'not_started' : fr.accountantReview.status} />
              <div>
                <div className="timeline-title">3. Accountant Review {fr.accountantReview.approverName && `(${fr.accountantReview.approverName})`}</div>
                <div className="timeline-meta">{fr.accountantReview.date ? formatDate(fr.accountantReview.date) : (fr.accountantReview.status === 'not_started' ? 'Not yet reached' : 'Financial accuracy, budget & GL coding')}</div>
                {fr.accountantReview.comment && <div className="timeline-comment">{fr.accountantReview.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={fr.ceo.status === 'not_started' ? 'not_started' : fr.ceo.status} />
              <div>
                <div className="timeline-title">4. CEO Approval {fr.ceo.approverName && `(${fr.ceo.approverName})`}</div>
                <div className="timeline-meta">{fr.ceo.date ? formatDate(fr.ceo.date) : (fr.ceo.status === 'not_started' ? 'Not yet reached' : 'Final approval')}</div>
                {fr.ceo.comment && <div className="timeline-comment">{fr.ceo.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={fr.payment.status === 'paid' ? 'approved' : fr.payment.status === 'pending' ? 'pending' : 'not_started'} />
              <div>
                <div className="timeline-title">5. Payment (Bookkeeper)</div>
                <div className="timeline-meta">{fr.payment.status === 'paid' ? `Paid ${money(fr.amount)} on ${formatDate(fr.payment.processedDate)} by ${fr.payment.processedBy}${fr.payment.reference ? ` · ${fr.payment.reference}` : ''}` : (fr.payment.status === 'pending' ? 'Awaiting payment' : 'Not yet reached')}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          {canEda && (
            <ActionCard icon={HeartHandshake} title="Entrepreneur Development Advisor Review">
              <p className="hint" style={{ marginBottom: 8 }}>Confirm alignment with the beneficiary's development plan.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { edaReview(fr.id, true, comment); clearComment(); }}>Aligned — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { edaReview(fr.id, false, comment); clearComment(); }}>Return with Comments</button>
              </div>
            </ActionCard>
          )}

          {canMentor && (
            <ActionCard icon={GraduationCap} title="Mentor Approval">
              <p className="hint" style={{ marginBottom: 8 }}>Endorse this asset purchase from a mentorship perspective.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { mentorApprove(fr.id, true, comment); clearComment(); }}>Endorse — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { mentorApprove(fr.id, false, comment); clearComment(); }}>Return with Comments</button>
              </div>
            </ActionCard>
          )}

          {canLineManager && (
            <ActionCard icon={UserCheck} title="Stage 1 — Line Manager Review">
              <p className="hint" style={{ marginBottom: 8 }}>Confirm budget availability and business justification.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { lineManagerReview(fr.id, true, comment); clearComment(); }}>Justified — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { lineManagerReview(fr.id, false, comment); clearComment(); }}>Return with Comments</button>
              </div>
            </ActionCard>
          )}

          {canBookkeeperVerify && (
            <ActionCard icon={ClipboardCheck} title="Stage 2 — Bookkeeper Verification">
              <p className="hint" style={{ marginBottom: 8 }}>Verify documentation completeness, coding and policy compliance. {fr.procurementRef ? `Procurement ref: ${fr.procurementRef}.` : `FIN-03: ${procurementRequirementFor(fr.amount)}.`}</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { bookkeeperVerify(fr.id, true, comment); clearComment(); }}>Verified — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { bookkeeperVerify(fr.id, false, comment); clearComment(); }}>Return for Corrections</button>
              </div>
            </ActionCard>
          )}

          {canAccountant && (
            <ActionCard icon={Calculator} title="Stage 3 — Accountant Review">
              <p className="hint" style={{ marginBottom: 8 }}>Against {budget?.name || fr.budgetId} — {money(budget ? budget.allocated - budget.committed - budget.spent : 0)} currently available. Approving converts the committed amount to spend.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { accountantReview(fr.id, true, comment); clearComment(); }}>Within Budget & Policy</button>
                <button className="btn btn-danger btn-block" onClick={() => { accountantReview(fr.id, false, comment); clearComment(); }}>Return to Requester</button>
              </div>
            </ActionCard>
          )}

          {canCeo && (
            <ActionCard icon={Crown} title="Stage 4 — CEO Approval">
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { financeCeoApprove(fr.id, true, comment); clearComment(); }}>Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { financeCeoApprove(fr.id, false, comment); clearComment(); }}>Decline</button>
              </div>
            </ActionCard>
          )}

          {canPay && (
            <ActionCard icon={Banknote} title="Stage 5 — Process Payment">
              <div className="field"><label>Payment Reference</label><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. EFT-99123" /></div>
              <button className="btn btn-primary btn-block" onClick={() => { processPayment(fr.id, reference); setReference(''); }}>Record & Pay</button>
            </ActionCard>
          )}

          {canResubmit && !editForm && (
            <ActionCard icon={RotateCcw} title="Returned for Corrections">
              <p className="hint" style={{ marginBottom: 8 }}>{returnComment || 'Edit and resubmit — this will restart the approval chain from the first stage.'}</p>
              <button className="btn btn-primary btn-block" onClick={startEdit}>Edit & Resubmit</button>
            </ActionCard>
          )}

          {canResubmit && editForm && (
            <ActionCard icon={RotateCcw} title="Edit & Resubmit">
              <form onSubmit={submitEdit}>
                <div className="field"><label>Vendor / Payee *</label><input className="input" value={editForm.vendor} onChange={(e) => setEditForm((f) => ({ ...f, vendor: e.target.value }))} /></div>
                <div className="field"><label>Description *</label><textarea className="input" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div className="field-row">
                  <div className="field"><label>Amount (ZAR) *</label><input type="number" className="input" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} /></div>
                  <div className="field"><label>Budget Line *</label>
                    <select className="input" value={editForm.budgetId} onChange={(e) => setEditForm((f) => ({ ...f, budgetId: e.target.value }))}>
                      {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field"><label>Procurement Reference</label><input className="input" value={editForm.procurementRef} onChange={(e) => setEditForm((f) => ({ ...f, procurementRef: e.target.value }))} /></div>
                {isApr && (
                  <div className="field"><label>Beneficiary Development Plan *</label><textarea className="input" value={editForm.beneficiaryDevelopmentPlan} onChange={(e) => setEditForm((f) => ({ ...f, beneficiaryDevelopmentPlan: e.target.value }))} /></div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => setEditForm(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-block">Resubmit</button>
                </div>
              </form>
            </ActionCard>
          )}

          {noActionAvailable && (
            <div className="empty-state" style={{ padding: '30px 10px' }}>No action currently available for your role on this request.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
