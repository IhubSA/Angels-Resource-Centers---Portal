import { Plane, Wallet, FileStack, Users, AlertCircle, TrendingUp, Clock, CheckCircle2, ArrowRight, ShieldCheck, Search, CalendarCheck, Crown, Gavel } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, BOARD_TREASURER_THRESHOLD } from '../../data/permissions';
import StatusBadge from '../common/StatusBadge';
import { money, formatDate, pct } from '../../utils/format';

const MODULE_ICON = { Travel: Plane, Finance: Wallet, Documents: FileStack };

export default function Dashboard({ setView }) {
  const { currentUser, role, travelRequests, invoices, documents, budgets, auditLog, pendingActions, users, scope } = useApp();

  const travelScope = scope('travel');
  const scopedTravel = travelRequests.filter((tr) => {
    if (travelScope === 'own') return tr.requesterId === currentUser.id;
    if (travelScope === 'department') return tr.department === currentUser.department;
    return true;
  });

  const totalAllocated = budgets.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalCommitted = budgets.reduce((s, b) => s + b.committed, 0);
  const docsPendingReview = documents.filter((d) => d.status === 'pending_review').length;
  const activeUsers = users.filter((u) => u.active).length;

  const stats = buildStats();

  function buildStats() {
    if (role === ROLES.ADMIN) {
      return [
        { label: 'Active Users', value: activeUsers, sub: `${users.length} total accounts`, icon: Users, tone: 'blue' },
        { label: 'Pending Approvals (all)', value: pendingActions.length, sub: 'Across all modules', icon: AlertCircle, tone: 'amber' },
        { label: 'Total Budget Allocated', value: money(totalAllocated), sub: `${money(totalSpent)} spent to date`, icon: Wallet, tone: 'green' },
        { label: 'Documents Pending Review', value: docsPendingReview, sub: `${documents.length} total documents`, icon: FileStack, tone: 'slate' },
      ];
    }
    if (role === ROLES.FINANCE_MANAGER) {
      const pendingInvoices = invoices.filter((i) => i.status === 'pending_level1' || i.status === 'pending_level2').length;
      return [
        { label: 'Awaiting My Approval', value: pendingActions.length, sub: 'Travel, invoices & documents', icon: AlertCircle, tone: 'amber' },
        { label: 'Budget Utilization', value: `${pct(totalSpent + totalCommitted, totalAllocated)}%`, sub: `${money(totalAllocated - totalSpent - totalCommitted)} available`, icon: TrendingUp, tone: 'green' },
        { label: 'Invoices In Flight', value: pendingInvoices, sub: `${invoices.length} total invoices`, icon: Wallet, tone: 'blue' },
        { label: 'Documents Pending Review', value: docsPendingReview, sub: `${documents.length} total documents`, icon: FileStack, tone: 'slate' },
      ];
    }
    if (role === ROLES.OPERATIONAL_HOD) {
      const teamActive = scopedTravel.filter((tr) => !['completed', 'rejected'].includes(tr.status)).length;
      const teamBudget = budgets.filter((b) => b.department === currentUser.department);
      const teamAvail = teamBudget.reduce((s, b) => s + (b.allocated - b.committed - b.spent), 0);
      return [
        { label: 'HOD Reviews Due', value: pendingActions.filter((a) => a.module === 'Travel').length, sub: 'Team travel requests', icon: AlertCircle, tone: 'amber' },
        { label: 'Team Requests Active', value: teamActive, sub: `${scopedTravel.length} total this year`, icon: Plane, tone: 'blue' },
        { label: 'Team Budget Available', value: money(teamAvail), sub: `${teamBudget.length} budget line(s)`, icon: Wallet, tone: 'green' },
        { label: 'Documents Pending Review', value: docsPendingReview, sub: 'Programs & related', icon: FileStack, tone: 'slate' },
      ];
    }
    if (role === ROLES.TRAVEL_OFFICE) {
      const qualityDue = travelRequests.filter((tr) => tr.status === 'pending_quality').length;
      const receiptsDue = travelRequests.filter((tr) => tr.status === 'expense_review').length;
      const cleared = travelRequests.filter((tr) => ['pending_booking', 'pending_finance_review', 'pending_ceo', 'pending_board', 'cleared_for_travel', 'expense_review', 'pending_payment', 'completed'].includes(tr.status)).length;
      return [
        { label: 'Quality Reviews Due', value: qualityDue, sub: 'Links, availability, policy (FIN-04-CHK-01)', icon: Search, tone: 'amber' },
        { label: 'Receipt Checks Due', value: receiptsDue, sub: 'Post-travel expense claims', icon: Clock, tone: 'amber' },
        { label: 'Requests Passed Quality', value: cleared, sub: `${travelRequests.length} total requests`, icon: CheckCircle2, tone: 'green' },
        { label: 'Documents Pending Review', value: docsPendingReview, sub: `${documents.length} total documents`, icon: FileStack, tone: 'slate' },
      ];
    }
    if (role === ROLES.BOOKKEEPER_FINANCE) {
      const readyToBook = travelRequests.filter((tr) => tr.status === 'pending_booking').length;
      const holds = travelRequests.filter((tr) => tr.status === 'finance_hold').length;
      const booked = travelRequests.filter((tr) => tr.booking.confirmed).length;
      return [
        { label: 'Ready to Book', value: readyToBook, sub: 'Passed Travel Office quality review', icon: CalendarCheck, tone: 'amber' },
        { label: 'Finance Holds to Resolve', value: holds, sub: 'Returned by Finance Manager', icon: AlertCircle, tone: 'red' },
        { label: 'Trips Booked', value: booked, sub: `${travelRequests.length} total requests`, icon: Plane, tone: 'blue' },
        { label: 'Budget Utilization', value: `${pct(totalSpent + totalCommitted, totalAllocated)}%`, sub: `${money(totalAllocated - totalSpent - totalCommitted)} available`, icon: TrendingUp, tone: 'green' },
      ];
    }
    if (role === ROLES.CEO) {
      const approvalsDue = travelRequests.filter((tr) => tr.status === 'pending_ceo').length;
      const highValue = travelRequests.filter((tr) => tr.boardTreasurer.required).length;
      const pendingInvoices = invoices.filter((i) => i.status === 'pending_level1' || i.status === 'pending_level2').length;
      return [
        { label: 'Trip Approvals Due', value: approvalsDue, sub: 'Awaiting CEO sign-off', icon: Crown, tone: 'amber' },
        { label: 'High-Value Trips', value: highValue, sub: `Above R${BOARD_TREASURER_THRESHOLD.toLocaleString()} threshold`, icon: Gavel, tone: 'slate' },
        { label: 'Budget Utilization', value: `${pct(totalSpent + totalCommitted, totalAllocated)}%`, sub: `${money(totalAllocated - totalSpent - totalCommitted)} available`, icon: TrendingUp, tone: 'green' },
        { label: 'Invoices In Flight', value: pendingInvoices, sub: `${invoices.length} total invoices`, icon: Wallet, tone: 'blue' },
      ];
    }
    if (role === ROLES.BOARD_TREASURER) {
      const signOffsDue = travelRequests.filter((tr) => tr.status === 'pending_board').length;
      const countersigned = travelRequests.filter((tr) => tr.boardTreasurer.status === 'approved').length;
      return [
        { label: 'Counter-signatures Due', value: signOffsDue, sub: `Above R${BOARD_TREASURER_THRESHOLD.toLocaleString()} threshold`, icon: Gavel, tone: 'amber' },
        { label: 'High-Value Trips Signed', value: countersigned, sub: `${travelRequests.filter((tr) => tr.boardTreasurer.required).length} flagged total`, icon: CheckCircle2, tone: 'green' },
        { label: 'Budget Utilization', value: `${pct(totalSpent + totalCommitted, totalAllocated)}%`, sub: `${money(totalAllocated - totalSpent - totalCommitted)} available`, icon: TrendingUp, tone: 'blue' },
        { label: 'Audit Trail Entries', value: auditLog.length, sub: 'Full history logged', icon: ShieldCheck, tone: 'slate' },
      ];
    }
    if (role === ROLES.STAFF) {
      const mine = scopedTravel;
      const activeCount = mine.filter((tr) => !['completed', 'rejected'].includes(tr.status)).length;
      const reimbPending = mine.reduce((s, tr) => s + tr.expenses.filter((e) => e.status === 'pending').length, 0);
      const myDocs = documents.filter((d) => d.uploadedBy === currentUser.name).length;
      return [
        { label: 'My Active Requests', value: activeCount, sub: `${mine.length} submitted total`, icon: Plane, tone: 'blue' },
        { label: 'Expenses Awaiting Review', value: reimbPending, sub: 'Reimbursement pending', icon: Clock, tone: 'amber' },
        { label: 'Completed Trips', value: mine.filter((tr) => tr.status === 'completed').length, sub: 'Reimbursed & closed', icon: CheckCircle2, tone: 'green' },
        { label: 'My Documents', value: myDocs, sub: 'Uploaded by me', icon: FileStack, tone: 'slate' },
      ];
    }
    // auditor
    const approvedThisMonth = travelRequests.filter((tr) => ['approved', 'booked', 'completed'].includes(tr.status)).length + invoices.filter((i) => i.status === 'paid').length;
    const compliancePct = pct(documents.filter((d) => d.complianceChecked).length, documents.length);
    return [
      { label: 'Approved Transactions', value: approvedThisMonth, sub: 'Travel & finance', icon: CheckCircle2, tone: 'green' },
      { label: 'Audit Trail Entries', value: auditLog.length, sub: 'Full history logged', icon: ShieldCheck, tone: 'blue' },
      { label: 'Document Compliance', value: `${compliancePct}%`, sub: `${documents.length} documents tracked`, icon: FileStack, tone: 'slate' },
      { label: 'Budget Lines Over 90%', value: budgets.filter((b) => pct(b.spent + b.committed, b.allocated) >= 90).length, sub: `${budgets.length} total budget lines`, icon: AlertCircle, tone: 'amber' },
    ];
  }

  const recentActivity = travelScope === 'own'
    ? auditLog.filter((a) => a.userName === currentUser.name).slice(0, 6)
    : auditLog.slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {currentUser.name.split(' ')[0]}</h1>
          <p className="page-subtitle">{ROLE_LABELS[role]} · {ROLE_DESCRIPTIONS[role]}</p>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        {stats.map((s) => (
          <div className="stat-tile" key={s.label}>
            <div className="stat-tile-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-tile-icon" style={{ background: `var(--${s.tone}-bg)`, color: `var(--${s.tone})` }}>
                <s.icon size={16} />
              </span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Requires Your Action</h3>
              <p>{pendingActions.length} item{pendingActions.length !== 1 ? 's' : ''} pending</p>
            </div>
          </div>
          <div style={{ padding: pendingActions.length ? '6px 10px' : 0 }}>
            {pendingActions.length === 0 && <div className="empty-state"><CheckCircle2 size={30} /><div style={{ fontWeight: 600, marginTop: 6 }}>Nothing pending — you're all caught up.</div></div>}
            {pendingActions.slice(0, 6).map((item) => {
              const Icon = MODULE_ICON[item.module] || AlertCircle;
              return (
                <button key={item.id} className="role-option" style={{ width: '100%' }} onClick={() => setView(item.module.toLowerCase())}>
                  <div className="notif-icon" style={{ background: item.priority === 'high' ? 'var(--red-bg)' : 'var(--brand-light)', color: item.priority === 'high' ? 'var(--red)' : 'var(--brand)' }}>
                    <Icon size={15} />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div className="notif-title">{item.label}</div>
                    <div className="notif-msg">{item.detail}</div>
                  </div>
                  <ArrowRight size={14} color="var(--text-faint)" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest logged actions</p>
            </div>
          </div>
          <div style={{ padding: '4px 18px 14px' }}>
            {recentActivity.length === 0 && <div className="empty-state" style={{ padding: 20 }}>No recent activity.</div>}
            {recentActivity.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 650 }}>{a.action}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{a.userName} · {a.details}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{a.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {[ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.AUDITOR, ROLES.CEO, ROLES.BOARD_TREASURER, ROLES.BOOKKEEPER_FINANCE].includes(role) && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div>
              <h3>Budget vs. Actual — FY2026</h3>
              <p>Real-time allocation, commitments & spend</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setView('finance')}>View Finance <ArrowRight size={13} /></button>
          </div>
          <div className="card-pad">
            {budgets.map((b) => {
              const spentPct = pct(b.spent, b.allocated);
              const commitPct = pct(b.committed, b.allocated);
              const available = b.allocated - b.spent - b.committed;
              return (
                <div key={b.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                    <strong>{b.name}</strong>
                    <span className="cell-muted">{money(b.spent)} + {money(b.committed)} committed of {money(b.allocated)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${spentPct}%`, background: 'var(--brand)' }} />
                    <div className="progress-fill" style={{ width: `${commitPct}%`, background: 'var(--amber)' }} />
                  </div>
                  {available < 0 && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Over budget by {money(Math.abs(available))}</div>}
                </div>
              );
            })}
            <div className="legend">
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--brand)' }} /> Spent</span>
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--amber)' }} /> Committed</span>
              <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--slate-bg)' }} /> Available</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
