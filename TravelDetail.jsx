import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Plane, CalendarCheck, Receipt, Banknote, Paperclip } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { money, formatDate } from '../../utils/format';

function TimelineIcon({ status }) {
  if (status === 'approved') return <div className="timeline-icon" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><CheckCircle2 size={14} /></div>;
  if (status === 'rejected') return <div className="timeline-icon" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><XCircle size={14} /></div>;
  if (status === 'pending') return <div className="timeline-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><Clock size={14} /></div>;
  return <div className="timeline-icon" style={{ background: 'var(--slate-bg)', color: 'var(--slate)' }}><Clock size={14} /></div>;
}

export default function TravelDetail({ requestId, onClose }) {
  const {
    travelRequests, budgets, can, currentUser,
    approveTravelLevel1, approveTravelLevel2, releaseBudgetHold, confirmBooking, submitExpense, processReimbursement,
  } = useApp();
  const tr = travelRequests.find((t) => t.id === requestId);
  const [comment, setComment] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [expForm, setExpForm] = useState({ category: 'Accommodation', amount: '', description: '', receiptName: '' });
  const [altBudget, setAltBudget] = useState('');

  if (!tr) return null;
  const budget = budgets.find((b) => b.id === tr.budgetId);

  const canL1 = can('travel', 'approveLevel1') && tr.status === 'pending_level1' && tr.level1.status === 'pending';
  const canL2 = can('travel', 'approveLevel2') && tr.status === 'pending_level2';
  const canResolveHold = can('travel', 'approveLevel2') && tr.status === 'budget_hold';
  const canBook = can('travel', 'book') && tr.status === 'approved';
  const canSubmitExpense = tr.requesterId === currentUser.id && ['booked', 'expense_review'].includes(tr.status);
  const canProcessReimbursement = can('travel', 'reimburse') && tr.expenses.some((e) => e.status === 'pending');

  return (
    <Modal open onClose={onClose} size="lg" title={`${tr.id} — ${tr.destination}`} subtitle={`Submitted by ${tr.requesterName} on ${formatDate(tr.createdDate)}`}>
      <div className="grid grid-2" style={{ alignItems: 'start', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <StatusBadge status={tr.status} />
            {tr.status === 'budget_hold' && <span className="badge badge-red"><AlertTriangle size={11} /> Insufficient funds</span>}
          </div>

          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Purpose</span><span className="v">{tr.purpose}</span></div>
            <div className="kv-row"><span className="k">Dates</span><span className="v">{formatDate(tr.startDate)} – {formatDate(tr.endDate)}</span></div>
            <div className="kv-row"><span className="k">Department</span><span className="v">{tr.department}</span></div>
            <div className="kv-row"><span className="k">Estimated Cost</span><span className="v">{money(tr.estimatedCost)}</span></div>
            <div className="kv-row"><span className="k">Budget Line</span><span className="v">{budget?.name || tr.budgetId}</span></div>
          </div>

          <div className="section-title">Approval Timeline</div>
          <div className="timeline">
            <div className="timeline-step">
              <TimelineIcon status={tr.level1.status} />
              <div>
                <div className="timeline-title">Level 1 — {tr.level1.approverName}</div>
                <div className="timeline-meta">{tr.level1.date ? formatDate(tr.level1.date) : 'Awaiting review'}</div>
                {tr.level1.comment && <div className="timeline-comment">{tr.level1.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.budgetCheck ? (tr.budgetCheck.sufficient ? 'approved' : 'rejected') : 'not_started'} />
              <div>
                <div className="timeline-title">Budget Verification Gate</div>
                <div className="timeline-meta">{tr.budgetCheck ? formatDate(tr.budgetCheck.checkedDate) : 'Runs after Level 1 approval'}</div>
                {tr.budgetCheck && (
                  <div className="timeline-comment">
                    {tr.budgetCheck.sufficient
                      ? `Funds available (${money(tr.budgetCheck.availableAtCheck)} at time of check).`
                      : `Insufficient funds — only ${money(tr.budgetCheck.availableAtCheck)} available.`}
                  </div>
                )}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.level2.status === 'not_started' ? 'not_started' : tr.level2.status} />
              <div>
                <div className="timeline-title">Level 2 — {tr.level2.approverName}</div>
                <div className="timeline-meta">{tr.level2.date ? formatDate(tr.level2.date) : (tr.level2.status === 'not_started' ? 'Not yet reached' : 'Awaiting review')}</div>
                {tr.level2.comment && <div className="timeline-comment">{tr.level2.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.booking.confirmed ? 'approved' : 'not_started'} />
              <div>
                <div className="timeline-title">Booking Confirmation</div>
                <div className="timeline-meta">{tr.booking.confirmed ? `Ref ${tr.booking.bookingRef} · ${formatDate(tr.booking.bookedDate)}` : 'Pending'}</div>
                {tr.booking.confirmed && <div className="timeline-comment">Actual cost: {money(tr.booking.actualCost)}</div>}
              </div>
            </div>
            {tr.expenses.length > 0 && (
              <div className="timeline-step">
                <TimelineIcon status={tr.reimbursement.status === 'paid' ? 'approved' : (tr.reimbursement.status === 'rejected' ? 'rejected' : 'pending')} />
                <div>
                  <div className="timeline-title">Reimbursement</div>
                  <div className="timeline-meta">{tr.reimbursement.status === 'paid' ? `Paid ${money(tr.reimbursement.amount)} on ${formatDate(tr.reimbursement.processedDate)}` : (tr.reimbursement.status === 'rejected' ? 'Rejected — resubmission required' : 'Awaiting Finance review')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Level 1 approval */}
          {canL1 && (
            <ActionCard icon={Plane} title="Level 1 Approval">
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { approveTravelLevel1(tr.id, true, comment); setComment(''); }}>Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { approveTravelLevel1(tr.id, false, comment); setComment(''); }}>Reject</button>
              </div>
            </ActionCard>
          )}

          {/* Level 2 approval */}
          {canL2 && (
            <ActionCard icon={CheckCircle2} title="Level 2 Approval (Finance)">
              <p className="hint" style={{ marginBottom: 8 }}>Budget verified — {money(tr.budgetCheck?.availableAtCheck || 0)} was available at Level 1.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { approveTravelLevel2(tr.id, true, comment); setComment(''); }}>Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { approveTravelLevel2(tr.id, false, comment); setComment(''); }}>Reject</button>
              </div>
            </ActionCard>
          )}

          {/* Budget hold resolution */}
          {canResolveHold && (
            <ActionCard icon={AlertTriangle} title="Resolve Budget Hold">
              <p className="hint" style={{ marginBottom: 8 }}>The original budget line does not have sufficient available funds. Reassign to another line or increase allocation in Finance, then re-verify.</p>
              <select className="input" value={altBudget} onChange={(e) => setAltBudget(e.target.value)} style={{ marginBottom: 10 }}>
                <option value="">Keep current budget line</option>
                {budgets.filter((b) => b.id !== tr.budgetId).map((b) => <option key={b.id} value={b.id}>{b.name} — {money(b.allocated - b.committed - b.spent)} available</option>)}
              </select>
              <button className="btn btn-primary btn-block" onClick={() => releaseBudgetHold(tr.id, altBudget || undefined)}>Re-verify & Release Hold</button>
            </ActionCard>
          )}

          {/* Booking */}
          {canBook && (
            <ActionCard icon={CalendarCheck} title="Confirm Booking">
              <div className="field"><label>Booking Reference</label><input className="input" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="e.g. BK-99123" /></div>
              <div className="field"><label>Actual Cost (ZAR)</label><input type="number" className="input" value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder={tr.estimatedCost} /></div>
              <button className="btn btn-primary btn-block" disabled={!bookingRef || !actualCost} onClick={() => confirmBooking(tr.id, bookingRef, Number(actualCost))}>Confirm Booking</button>
            </ActionCard>
          )}

          {/* Expense submission */}
          {canSubmitExpense && (
            <ActionCard icon={Receipt} title="Submit Expense">
              <div className="field-row">
                <div className="field"><label>Category</label>
                  <select className="input" value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                    <option>Accommodation</option><option>Meals & Incidentals</option><option>Local Transport</option><option>Flights</option><option>Other</option>
                  </select>
                </div>
                <div className="field"><label>Amount (ZAR)</label><input type="number" className="input" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="field"><label>Description</label><input className="input" value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="field">
                <label>Receipt</label>
                <label className="file-drop" style={{ display: 'block' }}>
                  <Paperclip size={15} style={{ marginBottom: 4 }} /><br />
                  {expForm.receiptName ? expForm.receiptName : 'Click to attach receipt (demo — no real upload)'}
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setExpForm((f) => ({ ...f, receiptName: e.target.files?.[0]?.name || '' }))} />
                </label>
              </div>
              <button className="btn btn-primary btn-block" disabled={!expForm.amount || !expForm.description}
                onClick={() => { submitExpense(tr.id, { ...expForm, amount: Number(expForm.amount), receiptName: expForm.receiptName || 'receipt.pdf' }); setExpForm({ category: 'Accommodation', amount: '', description: '', receiptName: '' }); }}>
                Submit Expense
              </button>
            </ActionCard>
          )}

          {/* Reimbursement processing */}
          {canProcessReimbursement && (
            <ActionCard icon={Banknote} title="Process Reimbursement">
              <div className="kv-list" style={{ marginBottom: 10 }}>
                {tr.expenses.filter((e) => e.status === 'pending').map((e) => (
                  <div className="kv-row" key={e.id}><span className="k">{e.category} — {e.description}</span><span className="v">{money(e.amount)}</span></div>
                ))}
                <div className="kv-row"><span className="k"><strong>Total</strong></span><span className="v"><strong>{money(tr.expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0))}</strong></span></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => processReimbursement(tr.id, true, '')}>Approve & Pay</button>
                <button className="btn btn-danger btn-block" onClick={() => processReimbursement(tr.id, false, 'Receipts require clarification.')}>Reject</button>
              </div>
            </ActionCard>
          )}

          {tr.expenses.length > 0 && (
            <div className="card" style={{ marginTop: 4 }}>
              <div className="card-header"><h3>Expenses & Receipts</h3></div>
              <div style={{ padding: '4px 18px 14px' }}>
                {tr.expenses.map((e) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.category}</div>
                      <div className="cell-muted">{e.description} · <Paperclip size={10} style={{ verticalAlign: -1 }} /> {e.receiptName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 650 }}>{money(e.amount)}</div>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canL1 && !canL2 && !canResolveHold && !canBook && !canSubmitExpense && !canProcessReimbursement && tr.expenses.length === 0 && (
            <div className="empty-state" style={{ padding: '30px 10px' }}>No action currently available for your role on this request.</div>
          )}
        </div>
      </div>
    </Modal>
  );
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
