import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck, Search, CalendarCheck, Landmark, Crown, Gavel, Receipt, Banknote, Paperclip } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { BOARD_TREASURER_THRESHOLD } from '../../data/permissions';
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
    hodReview, qualityReview, confirmBooking, financeManagerReview, resolveFinanceHold,
    ceoApprove, boardTreasurerSign, submitExpense, receiptCheck, financeManagerPay,
  } = useApp();
  const tr = travelRequests.find((t) => t.id === requestId);
  const [comment, setComment] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [holdBudget, setHoldBudget] = useState('');
  const [holdCost, setHoldCost] = useState('');
  const [expForm, setExpForm] = useState({ category: 'Accommodation', amount: '', description: '', receiptName: '', client: '', town: '', programme: '', activity: '' });

  if (!tr) return null;
  const budget = budgets.find((b) => b.id === tr.budgetId);

  const canHod = can('travel', 'hodReview') && tr.status === 'pending_hod';
  const canQuality = can('travel', 'qualityReview') && tr.status === 'pending_quality';
  const canBook = can('travel', 'book') && tr.status === 'pending_booking';
  const canResolveHold = can('travel', 'book') && tr.status === 'finance_hold';
  const canFinanceReview = can('travel', 'financeReview') && tr.status === 'pending_finance_review';
  const canCeo = can('travel', 'ceoApprove') && tr.status === 'pending_ceo';
  const canBoard = can('travel', 'boardSign') && tr.status === 'pending_board';
  const canSubmitExpense = tr.requesterId === currentUser.id && ['cleared_for_travel', 'reimbursement_hold'].includes(tr.status);
  const canReceiptCheck = can('travel', 'receiptCheck') && tr.status === 'expense_review';
  const canPay = can('travel', 'pay') && tr.status === 'pending_payment';

  const noActionAvailable = !canHod && !canQuality && !canBook && !canResolveHold && !canFinanceReview
    && !canCeo && !canBoard && !canSubmitExpense && !canReceiptCheck && !canPay;

  const clearComment = () => setComment('');

  return (
    <Modal open onClose={onClose} size="lg" title={`${tr.id} — ${tr.destination}`} subtitle={`Submitted by ${tr.requesterName} on ${formatDate(tr.createdDate)}`}>
      <div className="grid grid-2" style={{ alignItems: 'start', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <StatusBadge status={tr.status} />
            {tr.status === 'finance_hold' && <span className="badge badge-red"><AlertTriangle size={11} /> Returned to Bookkeeper/Finance</span>}
            {tr.status === 'reimbursement_hold' && <span className="badge badge-red"><AlertTriangle size={11} /> Missing documentation</span>}
            {tr.boardTreasurer.required && <span className="badge badge-amber"><Gavel size={11} /> Above R{BOARD_TREASURER_THRESHOLD.toLocaleString()} threshold</span>}
          </div>

          <div className="kv-list" style={{ marginBottom: 16 }}>
            <div className="kv-row"><span className="k">Purpose</span><span className="v">{tr.purpose}</span></div>
            <div className="kv-row"><span className="k">Dates</span><span className="v">{formatDate(tr.startDate)} – {formatDate(tr.endDate)}</span></div>
            <div className="kv-row"><span className="k">Department</span><span className="v">{tr.department}</span></div>
            <div className="kv-row"><span className="k">Estimated Cost</span><span className="v">{money(tr.estimatedCost)}</span></div>
            {tr.booking.actualCost != null && <div className="kv-row"><span className="k">Actual (booked) Cost</span><span className="v">{money(tr.booking.actualCost)}</span></div>}
            <div className="kv-row"><span className="k">Budget Line</span><span className="v">{budget?.name || tr.budgetId}</span></div>
          </div>

          <div className="section-title">Six-Stage Approval Chain</div>
          <div className="timeline">
            <div className="timeline-step">
              <TimelineIcon status={tr.hod.status} />
              <div>
                <div className="timeline-title">1. Operational/HOD — {tr.hod.approverName || 'Unassigned'}</div>
                <div className="timeline-meta">{tr.hod.date ? formatDate(tr.hod.date) : 'Business justification, dates & policy alignment'}</div>
                {tr.hod.comment && <div className="timeline-comment">{tr.hod.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.travelOffice.status === 'not_started' ? 'not_started' : tr.travelOffice.status} />
              <div>
                <div className="timeline-title">2. Travel Office — Quality Review {tr.travelOffice.approverName && `(${tr.travelOffice.approverName})`}</div>
                <div className="timeline-meta">{tr.travelOffice.date ? formatDate(tr.travelOffice.date) : (tr.travelOffice.status === 'not_started' ? 'Not yet reached' : 'Links, availability, policy compliance (FIN-04-CHK-01)')}</div>
                {tr.travelOffice.comment && <div className="timeline-comment">{tr.travelOffice.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.booking.confirmed ? 'approved' : 'not_started'} />
              <div>
                <div className="timeline-title">3. Bookkeeper/Finance — Book & Record in Xero</div>
                <div className="timeline-meta">{tr.booking.confirmed ? `Ref ${tr.booking.bookingRef} · ${formatDate(tr.booking.bookedDate)} by ${tr.booking.bookedByName}` : 'Not yet reached'}</div>
                {tr.booking.confirmed && <div className="timeline-comment">Actual cost recorded: {money(tr.booking.actualCost)}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.financeReview.status === 'not_started' ? 'not_started' : tr.financeReview.status} />
              <div>
                <div className="timeline-title">4. Finance Manager — Budget & Policy Review {tr.financeReview.approverName && `(${tr.financeReview.approverName})`}</div>
                <div className="timeline-meta">{tr.financeReview.date ? formatDate(tr.financeReview.date) : (tr.financeReview.status === 'not_started' ? 'Not yet reached' : 'Reviewing financial commitment')}</div>
                {tr.financeReview.comment && <div className="timeline-comment">{tr.financeReview.comment}</div>}
              </div>
            </div>
            <div className="timeline-step">
              <TimelineIcon status={tr.ceo.status === 'not_started' ? 'not_started' : tr.ceo.status} />
              <div>
                <div className="timeline-title">5. CEO Approval {tr.ceo.approverName && `(${tr.ceo.approverName})`}</div>
                <div className="timeline-meta">{tr.ceo.date ? formatDate(tr.ceo.date) : (tr.ceo.status === 'not_started' ? 'Not yet reached' : 'Awaiting approval')}</div>
                {tr.ceo.comment && <div className="timeline-comment">{tr.ceo.comment}</div>}
              </div>
            </div>
            {tr.boardTreasurer.required && (
              <div className="timeline-step">
                <TimelineIcon status={tr.boardTreasurer.status === 'not_started' ? 'not_started' : tr.boardTreasurer.status} />
                <div>
                  <div className="timeline-title">6. Board Treasurer — Counter-signature {tr.boardTreasurer.approverName && `(${tr.boardTreasurer.approverName})`}</div>
                  <div className="timeline-meta">{tr.boardTreasurer.date ? formatDate(tr.boardTreasurer.date) : 'High-value trip — required above threshold'}</div>
                  {tr.boardTreasurer.comment && <div className="timeline-comment">{tr.boardTreasurer.comment}</div>}
                </div>
              </div>
            )}
            {tr.expenses.length > 0 && (
              <>
                <div className="timeline-step">
                  <TimelineIcon status={tr.receiptCheck.status === 'not_started' ? 'not_started' : tr.receiptCheck.status} />
                  <div>
                    <div className="timeline-title">Travel Office — Receipt Check {tr.receiptCheck.approverName && `(${tr.receiptCheck.approverName})`}</div>
                    <div className="timeline-meta">{tr.receiptCheck.date ? formatDate(tr.receiptCheck.date) : 'Checking receipts against itinerary & policy'}</div>
                    {tr.receiptCheck.comment && <div className="timeline-comment">{tr.receiptCheck.comment}</div>}
                  </div>
                </div>
                <div className="timeline-step">
                  <TimelineIcon status={tr.reimbursement.status === 'paid' ? 'approved' : 'pending'} />
                  <div>
                    <div className="timeline-title">Finance Manager — Record & Pay</div>
                    <div className="timeline-meta">{tr.reimbursement.status === 'paid' ? `Paid ${money(tr.reimbursement.amount)} on ${formatDate(tr.reimbursement.processedDate)}` : 'Awaiting payment'}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          {canHod && (
            <ActionCard icon={UserCheck} title="Stage 1 — HOD Review">
              <p className="hint" style={{ marginBottom: 8 }}>Verify dates, business purpose, and alignment with nonprofit policy.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { hodReview(tr.id, true, comment); clearComment(); }}>Justified — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { hodReview(tr.id, false, comment); clearComment(); }}>Return with Comments</button>
              </div>
            </ActionCard>
          )}

          {canQuality && (
            <ActionCard icon={Search} title="Stage 2 — Travel Office Quality Review">
              <p className="hint" style={{ marginBottom: 8 }}>Check link validity, availability, and policy compliance (FIN-04-CHK-01).</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { qualityReview(tr.id, true, comment); clearComment(); }}>Passes — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { qualityReview(tr.id, false, comment); clearComment(); }}>Return for Corrections</button>
              </div>
            </ActionCard>
          )}

          {canBook && (
            <ActionCard icon={CalendarCheck} title="Stage 3 — Book Flights & Accommodation">
              <div className="field"><label>Booking Reference</label><input className="input" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="e.g. BK-99123" /></div>
              <div className="field"><label>Actual Cost (ZAR, for Xero)</label><input type="number" className="input" value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder={tr.estimatedCost} /></div>
              <button className="btn btn-primary btn-block" disabled={!bookingRef || !actualCost} onClick={() => confirmBooking(tr.id, bookingRef, Number(actualCost))}>Confirm Booking & Record in Xero</button>
            </ActionCard>
          )}

          {canResolveHold && (
            <ActionCard icon={AlertTriangle} title="Resolve Finance Hold">
              <p className="hint" style={{ marginBottom: 8 }}>Finance Manager returned this trip. Adjust the booking and/or reassign the budget line, then resubmit for review.</p>
              <div className="field"><label>Reassign Budget Line</label>
                <select className="input" value={holdBudget} onChange={(e) => setHoldBudget(e.target.value)}>
                  <option value="">Keep current budget line</option>
                  {budgets.filter((b) => b.id !== tr.budgetId).map((b) => <option key={b.id} value={b.id}>{b.name} — {money(b.allocated - b.committed - b.spent)} available</option>)}
                </select>
              </div>
              <div className="field"><label>Revised Actual Cost (optional)</label><input type="number" className="input" value={holdCost} onChange={(e) => setHoldCost(e.target.value)} placeholder={tr.booking.actualCost} /></div>
              <button className="btn btn-primary btn-block" onClick={() => { resolveFinanceHold(tr.id, holdBudget || undefined, holdCost); setHoldBudget(''); setHoldCost(''); }}>Resubmit for Finance Review</button>
            </ActionCard>
          )}

          {canFinanceReview && (
            <ActionCard icon={Landmark} title="Stage 4 — Finance Manager Review">
              <p className="hint" style={{ marginBottom: 8 }}>Booked cost {money(tr.booking.actualCost || 0)} against {budget?.name || tr.budgetId} — {money(budget ? budget.allocated - budget.committed - budget.spent : 0)} currently available.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { financeManagerReview(tr.id, true, comment); clearComment(); }}>Within Budget & Policy</button>
                <button className="btn btn-danger btn-block" onClick={() => { financeManagerReview(tr.id, false, comment); clearComment(); }}>Return to Bookkeeper/Finance</button>
              </div>
            </ActionCard>
          )}

          {canCeo && (
            <ActionCard icon={Crown} title="Stage 5 — CEO Approval">
              {(tr.booking.actualCost || tr.estimatedCost) > BOARD_TREASURER_THRESHOLD && (
                <p className="hint" style={{ marginBottom: 8 }}>This trip is above the R{BOARD_TREASURER_THRESHOLD.toLocaleString()} threshold — approving will route it to the Board Treasurer for counter-signature.</p>
              )}
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { ceoApprove(tr.id, true, comment); clearComment(); }}>Approve Trip</button>
                <button className="btn btn-danger btn-block" onClick={() => { ceoApprove(tr.id, false, comment); clearComment(); }}>Decline</button>
              </div>
            </ActionCard>
          )}

          {canBoard && (
            <ActionCard icon={Gavel} title="Stage 6 — Board Treasurer Counter-signature">
              <p className="hint" style={{ marginBottom: 8 }}>High-value trip — {money(tr.booking.actualCost || tr.estimatedCost)}, above the R{BOARD_TREASURER_THRESHOLD.toLocaleString()} threshold.</p>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { boardTreasurerSign(tr.id, true, comment); clearComment(); }}>Counter-sign</button>
                <button className="btn btn-danger btn-block" onClick={() => { boardTreasurerSign(tr.id, false, comment); clearComment(); }}>Decline</button>
              </div>
            </ActionCard>
          )}

          {canSubmitExpense && (
            <ActionCard icon={Receipt} title={tr.status === 'reimbursement_hold' ? 'Resubmit Expense Claim' : 'Submit Expense Claim'}>
              {tr.status === 'reimbursement_hold' && <p className="hint" style={{ marginBottom: 8 }}>Travel Office requested corrections — supply the missing receipt or documentation below.</p>}
              <div className="field-row">
                <div className="field"><label>Category</label>
                  <select className="input" value={expForm.category} onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}>
                    <option>Accommodation</option><option>Meals & Incidentals</option><option>Local Transport</option><option>Flights</option><option>Other</option>
                  </select>
                </div>
                <div className="field"><label>Amount (ZAR)</label><input type="number" className="input" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} /></div>
              </div>
              <div className="field"><label>Description</label><input className="input" value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="field-row">
                <div className="field"><label>Client</label><input className="input" value={expForm.client} onChange={(e) => setExpForm((f) => ({ ...f, client: e.target.value }))} /></div>
                <div className="field"><label>Town</label><input className="input" value={expForm.town} onChange={(e) => setExpForm((f) => ({ ...f, town: e.target.value }))} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Programme</label><input className="input" value={expForm.programme} onChange={(e) => setExpForm((f) => ({ ...f, programme: e.target.value }))} /></div>
                <div className="field"><label>Activity</label><input className="input" value={expForm.activity} onChange={(e) => setExpForm((f) => ({ ...f, activity: e.target.value }))} /></div>
              </div>
              <div className="field">
                <label>Receipt</label>
                <label className="file-drop" style={{ display: 'block' }}>
                  <Paperclip size={15} style={{ marginBottom: 4 }} /><br />
                  {expForm.receiptName ? expForm.receiptName : 'Click to attach receipt (demo — no real upload)'}
                  <input type="file" style={{ display: 'none' }} onChange={(e) => setExpForm((f) => ({ ...f, receiptName: e.target.files?.[0]?.name || '' }))} />
                </label>
              </div>
              <button className="btn btn-primary btn-block" disabled={!expForm.amount || !expForm.description}
                onClick={() => { submitExpense(tr.id, { ...expForm, amount: Number(expForm.amount), receiptName: expForm.receiptName || 'receipt.pdf' }); setExpForm({ category: 'Accommodation', amount: '', description: '', receiptName: '', client: '', town: '', programme: '', activity: '' }); }}>
                Submit Expense Claim
              </button>
            </ActionCard>
          )}

          {canReceiptCheck && (
            <ActionCard icon={Search} title="Receipt Check (Travel Office)">
              <div className="kv-list" style={{ marginBottom: 10 }}>
                {tr.expenses.filter((e) => e.status === 'pending').map((e) => (
                  <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="kv-row"><span className="k">{e.category} — {e.description}</span><span className="v">{money(e.amount)}</span></div>
                    <div className="cell-muted" style={{ fontSize: 11 }}>{[e.client, e.town, e.programme, e.activity].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
                <div className="kv-row"><span className="k"><strong>Total</strong></span><span className="v"><strong>{money(tr.expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0))}</strong></span></div>
              </div>
              <textarea className="input" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-block" onClick={() => { receiptCheck(tr.id, true, comment); clearComment(); }}>Checked — Approve</button>
                <button className="btn btn-danger btn-block" onClick={() => { receiptCheck(tr.id, false, comment || 'Missing documentation'); clearComment(); }}>Return with Questions</button>
              </div>
            </ActionCard>
          )}

          {canPay && (
            <ActionCard icon={Banknote} title="Record Expense & Issue Payment">
              <div className="kv-list" style={{ marginBottom: 10 }}>
                <div className="kv-row"><span className="k"><strong>Total to pay</strong></span><span className="v"><strong>{money(tr.expenses.reduce((s, e) => s + e.amount, 0))}</strong></span></div>
              </div>
              <button className="btn btn-primary btn-block" onClick={() => financeManagerPay(tr.id)}>Record & Pay</button>
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
                      {[e.client, e.town, e.programme, e.activity].some(Boolean) && (
                        <div className="cell-muted" style={{ fontSize: 11 }}>{[e.client, e.town, e.programme, e.activity].filter(Boolean).join(' · ')}</div>
                      )}
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

          {noActionAvailable && tr.expenses.length === 0 && (
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
