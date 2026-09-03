import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROLES, canWith, viewScopeWith, DEFAULT_PERMISSIONS, BOARD_TREASURER_THRESHOLD } from '../data/permissions';
import { supabase, TABLES } from '../lib/supabaseClient';
import { mapUser, mapBudget, mapTravelRequest, mapFinanceRequest, mapDocument, mapAuditLog, mapRolePermission } from '../lib/mappers';

const AppContext = createContext(null);

// Collision-resistant IDs: a plain incrementing counter restarts from the same value every
// page load, which collided with rows already saved to Supabase from earlier sessions
// (visible as 409 "duplicate key" errors on audit log / other inserts). Mixing in the
// current time plus a random suffix keeps IDs unique across reloads and browsers.
let idCounter = 0;
const nextId = (prefix) => `${prefix}-${Date.now().toString(36)}${(++idCounter).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5);
};

const FALLBACK_USER = { id: null, name: '', email: '', role: ROLES.STAFF, department: '', title: '', active: true, initials: '' };
const DEMO_ROLE_ORDER = [
  ROLES.ADMIN, ROLES.STAFF, ROLES.OPERATIONAL_HOD, ROLES.LINE_MANAGER, ROLES.TRAVEL_OFFICE,
  ROLES.BOOKKEEPER_FINANCE, ROLES.ACCOUNTANT, ROLES.FINANCE_MANAGER, ROLES.CEO, ROLES.BOARD_TREASURER,
  ROLES.ENTREPRENEUR_DEV_ADVISOR, ROLES.MENTOR, ROLES.AUDITOR,
];

export function AppProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState('u1');
  const [users, setUsers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [travelRequests, setTravelRequests] = useState([]);
  const [financeRequests, setFinanceRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || users[0] || FALLBACK_USER, [users, currentUserId]);
  const role = currentUser.role;

  // Live permission matrix: DB rows win, DEFAULT_PERMISSIONS fills in any role not yet in the database.
  const effectivePermissions = useMemo(() => ({ ...DEFAULT_PERMISSIONS, ...rolePermissions }), [rolePermissions]);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() });
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 3500);
  }, []);

  // ---------- Initial load from Supabase ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [usersRes, budgetsRes, travelRes, expensesRes, financeRes, docsRes, versionsRes, auditRes, permsRes] = await Promise.all([
          supabase.from(TABLES.users).select('*').order('id'),
          supabase.from(TABLES.budgets).select('*').order('id'),
          supabase.from(TABLES.travelRequests).select('*').order('created_date', { ascending: false }),
          supabase.from(TABLES.travelExpenses).select('*'),
          supabase.from(TABLES.financeRequests).select('*').order('submitted_date', { ascending: false }),
          supabase.from(TABLES.documents).select('*').order('upload_date', { ascending: false }),
          supabase.from(TABLES.documentVersions).select('*'),
          supabase.from(TABLES.auditLog).select('*').order('ts', { ascending: false }),
          supabase.from(TABLES.rolePermissions).select('*'),
        ]);
        const firstError = [usersRes, budgetsRes, travelRes, expensesRes, financeRes, docsRes, versionsRes, auditRes, permsRes]
          .map((r) => r.error).find(Boolean);
        if (firstError) throw firstError;
        if (cancelled) return;
        setUsers(usersRes.data.map(mapUser));
        setBudgets(budgetsRes.data.map(mapBudget));
        setTravelRequests(travelRes.data.map((r) => mapTravelRequest(r, expensesRes.data)));
        setFinanceRequests(financeRes.data.map(mapFinanceRequest));
        setDocuments(docsRes.data.map((d) => mapDocument(d, versionsRes.data)));
        setAuditLog(auditRes.data.map(mapAuditLog));
        setRolePermissions(Object.fromEntries(permsRes.data.map(mapRolePermission).map((r) => [r.role, r.permissions])));
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load data from Supabase.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const persistError = useCallback((err, what) => {
    console.error(`[Supabase] Failed to save ${what}:`, err);
    showToast(`Saved on screen, but failed to sync ${what} to the database.`, 'warn');
  }, [showToast]);

  const persistInsert = useCallback((table, row, what) => {
    supabase.from(table).insert(row).then(({ error }) => { if (error) persistError(error, what); });
  }, [persistError]);

  const persistUpdate = useCallback((table, id, patch, what, pkColumn = 'id') => {
    supabase.from(table).update(patch).eq(pkColumn, id).then(({ error }) => { if (error) persistError(error, what); });
  }, [persistError]);

  const log = useCallback((action, module, targetId, details) => {
    const id = nextId('AL');
    const timestamp = nowStamp();
    setAuditLog((prev) => [{ id, timestamp, userName: currentUser.name, role: currentUser.role, action, module, targetId, details }, ...prev]);
    persistInsert(TABLES.auditLog, { id, user_name: currentUser.name, role: currentUser.role, action, module, target_id: targetId, details }, 'audit log entry');
  }, [currentUser, persistInsert]);

  const notify = useCallback((entry) => {
    setNotifications((prev) => [
      { id: nextId('N'), date: nowStamp(), read: false, ...entry },
      ...prev,
    ]);
  }, []);

  const switchRole = useCallback((newRole) => {
    const u = users.find((u) => u.role === newRole);
    if (u) setCurrentUserId(u.id);
  }, [users]);

  const demoRoster = useMemo(
    () => DEMO_ROLE_ORDER.map((r) => users.find((u) => u.role === r)).filter(Boolean),
    [users]
  );

  // ---------- Budgets ----------
  const createBudget = useCallback((data) => {
    const b = { id: nextId('B'), committed: 0, spent: 0, ...data };
    setBudgets((prev) => [b, ...prev]);
    log('Created budget', 'Finance', b.id, `${b.name} — allocated R${data.allocated.toLocaleString()}`);
    showToast(`Budget "${b.name}" created`);
    persistInsert(TABLES.budgets, {
      id: b.id, name: b.name, category: b.category, fiscal_year: b.fiscalYear, department: b.department, owner: b.owner,
      allocated: b.allocated, committed: b.committed, spent: b.spent,
    }, 'new budget');
  }, [log, showToast, persistInsert]);

  const adjustBudgetAllocation = useCallback((budgetId, newAllocated) => {
    setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, allocated: newAllocated } : b)));
    const b = budgets.find((x) => x.id === budgetId);
    log('Adjusted budget allocation', 'Finance', budgetId, `${b?.name || budgetId} — new allocation R${newAllocated.toLocaleString()}`);
    showToast('Budget allocation updated');
    persistUpdate(TABLES.budgets, budgetId, { allocated: newAllocated }, 'budget allocation');
  }, [budgets, log, showToast, persistUpdate]);

  const budgetAvailable = useCallback((b) => b.allocated - b.committed - b.spent, []);

  // ---------- Travel Management ----------
  // Six-stage approval chain per ATMS-FRM-001: HOD -> Travel Office (quality) -> Bookkeeper (booking)
  // -> Finance Manager (budget/policy, after booking) -> CEO -> Board Treasurer (conditional, > R50,000).
  // Then post-travel: Travel Office (receipt check) -> Finance Manager (record & pay).
  const submitTravelRequest = useCallback((data) => {
    const hodUser = users.find((u) => u.role === ROLES.OPERATIONAL_HOD && u.department === currentUser.department)
      || users.find((u) => u.role === ROLES.OPERATIONAL_HOD);
    const tr = {
      id: nextId('TR'),
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      department: currentUser.department,
      createdDate: today(),
      status: 'pending_hod',
      hod: { approverId: null, approverName: hodUser?.name || 'Operational/HOD', status: 'pending', date: null, comment: '' },
      travelOffice: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      booking: { confirmed: false, bookedBy: null, bookedByName: '', bookingRef: null, bookedDate: null, actualCost: null },
      financeReview: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      ceo: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      boardTreasurer: { required: false, approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      receiptCheck: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      expenses: [],
      reimbursement: { status: 'not_applicable', amount: 0, processedDate: null, processedBy: null },
      ...data,
    };

    setTravelRequests((prev) => [tr, ...prev]);
    log('Submitted travel request', 'Travel', tr.id, `${data.destination} — links only, estimated R${data.estimatedCost.toLocaleString()}`);
    notify({ role: ROLES.OPERATIONAL_HOD, title: 'Travel request awaiting HOD review', message: `${tr.requesterName} — ${data.destination}`, module: 'Travel', targetId: tr.id });
    showToast('Travel request submitted');

    persistInsert(TABLES.travelRequests, {
      id: tr.id, requester_id: tr.requesterId, requester_name: tr.requesterName, department: tr.department,
      destination: tr.destination, purpose: tr.purpose, start_date: tr.startDate, end_date: tr.endDate,
      estimated_cost: tr.estimatedCost, budget_id: tr.budgetId, status: tr.status, created_date: tr.createdDate,
      hod: tr.hod, travel_office: tr.travelOffice, booking: tr.booking, finance_review: tr.financeReview,
      ceo: tr.ceo, board_treasurer: tr.boardTreasurer, receipt_check: tr.receiptCheck, reimbursement: tr.reimbursement,
    }, 'travel request');
    return tr.id;
  }, [currentUser, users, log, notify, showToast, persistInsert]);

  // Stage 1 — Operational/HOD: business justification, dates, policy alignment.
  const hodReview = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const hod = { ...tr.hod, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('HOD returned travel request', 'Travel', id, comment || 'Not justified — returned with comments');
        notify({ userId: tr.requesterId, title: 'Travel request returned', message: `${tr.destination} — ${comment || 'Not justified'}`, module: 'Travel', targetId: id });
        showToast('Travel request returned to requester', 'warn');
        persistUpdate(TABLES.travelRequests, id, { hod, status: 'rejected' }, 'travel request');
        return { ...tr, hod, status: 'rejected' };
      }
      const travelOffice = { ...tr.travelOffice, status: 'pending' };
      log('HOD approved travel request — justified', 'Travel', id, comment || tr.destination);
      notify({ role: ROLES.TRAVEL_OFFICE, title: 'Travel request awaiting quality review', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Approved — forwarded to Travel Office for quality review');
      persistUpdate(TABLES.travelRequests, id, { hod, travel_office: travelOffice, status: 'pending_quality' }, 'travel request');
      return { ...tr, hod, travelOffice, status: 'pending_quality' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Stage 2 — Travel Office: quality review per FIN-04-CHK-01 (link validity, availability, policy compliance).
  const qualityReview = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const travelOffice = { ...tr.travelOffice, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('Travel Office returned request — corrections needed', 'Travel', id, comment || 'Failed quality review');
        notify({ userId: tr.requesterId, title: 'Travel request returned for corrections', message: `${tr.destination} — ${comment || 'Corrected links required'}`, module: 'Travel', targetId: id });
        showToast('Returned to requester for corrected links', 'warn');
        persistUpdate(TABLES.travelRequests, id, { travel_office: travelOffice, status: 'rejected' }, 'travel request');
        return { ...tr, travelOffice, status: 'rejected' };
      }
      log('Travel Office passed quality review', 'Travel', id, comment || tr.destination);
      notify({ role: ROLES.BOOKKEEPER_FINANCE, title: 'Travel request ready to book', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Passed quality review — forwarded to Bookkeeper/Finance to book');
      persistUpdate(TABLES.travelRequests, id, { travel_office: travelOffice, status: 'pending_booking' }, 'travel request');
      return { ...tr, travelOffice, status: 'pending_booking' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Stage 3 — Bookkeeper/Finance: book flights & accommodation; record confirmations and costs in Xero.
  const confirmBooking = useCallback((id, bookingRef, actualCost) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const budget = budgets.find((b) => b.id === tr.budgetId);
      const newCommitted = budget ? budget.committed + actualCost : actualCost;
      setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted } : b)));
      const booking = { confirmed: true, bookedBy: currentUser.id, bookedByName: currentUser.name, bookingRef, bookedDate: today(), actualCost };
      const financeReview = { ...tr.financeReview, status: 'pending' };
      log('Booked flights & accommodation', 'Travel', id, `${bookingRef} — recorded in Xero at R${actualCost.toLocaleString()}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting financial review', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Booking recorded — forwarded to Finance Manager for review');
      persistUpdate(TABLES.travelRequests, id, { booking, finance_review: financeReview, status: 'pending_finance_review' }, 'booking confirmation');
      persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted }, 'budget commitment');
      return { ...tr, booking, financeReview, status: 'pending_finance_review' };
    }));
  }, [budgets, currentUser, log, notify, showToast, persistUpdate]);

  // Stage 4 — Finance Manager: review financial commitment against budget and policy.
  const financeManagerReview = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const financeReview = { ...tr.financeReview, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        const budget = budgets.find((b) => b.id === tr.budgetId);
        const newCommitted = budget ? Math.max(0, budget.committed - (tr.booking.actualCost || 0)) : 0;
        setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted } : b)));
        log('Finance Manager returned request to Bookkeeper/Finance', 'Travel', id, comment || 'Not within budget & policy');
        notify({ role: ROLES.BOOKKEEPER_FINANCE, title: 'Travel request on finance hold', message: `${tr.destination} — ${comment || 'Return with comments'}`, module: 'Travel', targetId: id, priority: 'high' });
        showToast('Returned to Bookkeeper/Finance with comments', 'warn');
        persistUpdate(TABLES.travelRequests, id, { finance_review: financeReview, status: 'finance_hold' }, 'travel request');
        persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted }, 'budget commitment');
        return { ...tr, financeReview, status: 'finance_hold' };
      }
      // Approved — the committed booking cost is now a confirmed spend against the budget.
      const budget = budgets.find((b) => b.id === tr.budgetId);
      const actualCost = tr.booking.actualCost || 0;
      const newCommitted = budget ? Math.max(0, budget.committed - actualCost) : 0;
      const newSpent = budget ? budget.spent + actualCost : actualCost;
      setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted, spent: newSpent } : b)));
      const ceo = { ...tr.ceo, status: 'pending' };
      log('Finance Manager approved — within budget & policy', 'Travel', id, comment || tr.destination);
      notify({ role: ROLES.CEO, title: 'Travel request awaiting CEO approval', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Approved — forwarded to CEO');
      persistUpdate(TABLES.travelRequests, id, { finance_review: financeReview, ceo, status: 'pending_ceo' }, 'travel request');
      persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted, spent: newSpent }, 'budget totals');
      return { ...tr, financeReview, ceo, status: 'pending_ceo' };
    }));
  }, [currentUser, budgets, log, notify, showToast, persistUpdate]);

  // Resolve a finance hold — Bookkeeper/Finance corrects the booking (optionally reassigns budget) and resubmits.
  const resolveFinanceHold = useCallback((id, newBudgetId, newActualCost) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const budgetId = newBudgetId || tr.budgetId;
      const actualCost = newActualCost != null && newActualCost !== '' ? Number(newActualCost) : tr.booking.actualCost;
      const budget = budgets.find((b) => b.id === budgetId);
      const newCommitted = budget ? budget.committed + actualCost : actualCost;
      setBudgets((prevB) => prevB.map((b) => (b.id === budgetId ? { ...b, committed: newCommitted } : b)));
      const booking = { ...tr.booking, actualCost };
      const financeReview = { ...tr.financeReview, status: 'pending' };
      log('Bookkeeper/Finance resolved finance hold', 'Travel', id, `Resubmitted — ${budget?.name || budgetId}, R${actualCost.toLocaleString()}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting financial review', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Resubmitted for Finance Manager review');
      persistUpdate(TABLES.travelRequests, id, { budget_id: budgetId, booking, finance_review: financeReview, status: 'pending_finance_review' }, 'travel request');
      persistUpdate(TABLES.budgets, budgetId, { committed: newCommitted }, 'budget commitment');
      return { ...tr, budgetId, booking, financeReview, status: 'pending_finance_review' };
    }));
  }, [budgets, log, notify, showToast, persistUpdate]);

  // Stage 5 — CEO: approve trip; routes to Board Treasurer when above threshold.
  const ceoApprove = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const ceo = { ...tr.ceo, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('CEO declined travel request', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request declined', message: `${tr.destination} — ${comment || 'Declined by CEO'}`, module: 'Travel', targetId: id });
        showToast('Travel request declined', 'warn');
        persistUpdate(TABLES.travelRequests, id, { ceo, status: 'rejected' }, 'travel request');
        return { ...tr, ceo, status: 'rejected' };
      }
      const aboveThreshold = (tr.booking.actualCost || tr.estimatedCost) > BOARD_TREASURER_THRESHOLD;
      if (aboveThreshold) {
        const boardTreasurer = { ...tr.boardTreasurer, required: true, status: 'pending' };
        log('CEO approved — above Board Treasurer threshold', 'Travel', id, comment || tr.destination);
        notify({ role: ROLES.BOARD_TREASURER, title: 'High-value trip awaiting counter-signature', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id, priority: 'high' });
        showToast('Approved — above threshold, forwarded to Board Treasurer');
        persistUpdate(TABLES.travelRequests, id, { ceo, board_treasurer: boardTreasurer, status: 'pending_board' }, 'travel request');
        return { ...tr, ceo, boardTreasurer, status: 'pending_board' };
      }
      log('CEO approved travel request — cleared for travel', 'Travel', id, comment || tr.destination);
      notify({ userId: tr.requesterId, title: 'Travel request approved', message: `${tr.destination} — cleared for travel`, module: 'Travel', targetId: id });
      showToast('Travel request approved — cleared for travel');
      persistUpdate(TABLES.travelRequests, id, { ceo, status: 'cleared_for_travel' }, 'travel request');
      return { ...tr, ceo, status: 'cleared_for_travel' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Stage 6 (conditional) — Board Treasurer: counter-sign high-value trip approvals (> R50,000).
  const boardTreasurerSign = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const boardTreasurer = { ...tr.boardTreasurer, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('Board Treasurer declined to counter-sign', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request declined', message: `${tr.destination} — ${comment || 'Declined by Board Treasurer'}`, module: 'Travel', targetId: id });
        showToast('Travel request declined by Board Treasurer', 'warn');
        persistUpdate(TABLES.travelRequests, id, { board_treasurer: boardTreasurer, status: 'rejected' }, 'travel request');
        return { ...tr, boardTreasurer, status: 'rejected' };
      }
      log('Board Treasurer counter-signed high-value trip', 'Travel', id, comment || tr.destination);
      notify({ userId: tr.requesterId, title: 'Travel request approved', message: `${tr.destination} — cleared for travel`, module: 'Travel', targetId: id });
      showToast('Counter-signed — cleared for travel');
      persistUpdate(TABLES.travelRequests, id, { board_treasurer: boardTreasurer, status: 'cleared_for_travel' }, 'travel request');
      return { ...tr, boardTreasurer, status: 'cleared_for_travel' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Post-travel — traveller retains receipts and submits an expense claim tagged Client · Town · Programme · Activity.
  const submitExpense = useCallback((travelId, expense) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const ex = { id: nextId('EX'), submittedDate: today(), status: 'pending', ...expense };
      const wasHold = tr.status === 'reimbursement_hold';
      const newStatus = (tr.status === 'cleared_for_travel' || wasHold) ? 'expense_review' : tr.status;
      const receiptCheck = wasHold ? { ...tr.receiptCheck, status: 'pending' } : tr.receiptCheck;
      log(wasHold ? 'Resubmitted expense claim' : 'Submitted expense claim', 'Travel', travelId, `${expense.category} — R${expense.amount.toLocaleString()} (${expense.client || ''} ${expense.town || ''} ${expense.programme || ''} ${expense.activity || ''})`.trim());
      notify({ role: ROLES.TRAVEL_OFFICE, title: 'Expense claim awaiting receipt check', message: `${tr.requesterName} — ${expense.category} R${expense.amount.toLocaleString()}`, module: 'Travel', targetId: travelId });
      showToast('Expense claim submitted with receipt');
      persistInsert(TABLES.travelExpenses, {
        id: ex.id, travel_request_id: travelId, category: ex.category, amount: ex.amount,
        description: ex.description, receipt_name: ex.receiptName, submitted_date: ex.submittedDate, status: ex.status,
        client: ex.client || '', town: ex.town || '', programme: ex.programme || '', activity: ex.activity || '',
      }, 'expense');
      const patch = { status: newStatus };
      if (wasHold) patch.receipt_check = receiptCheck;
      persistUpdate(TABLES.travelRequests, travelId, patch, 'travel request status');
      return { ...tr, expenses: [...tr.expenses, ex], status: newStatus, receiptCheck };
    }));
  }, [log, notify, showToast, persistInsert, persistUpdate]);

  // Stage 6 (post-travel) — Travel Office: check receipts against approved itinerary and policy.
  const receiptCheck = useCallback((travelId, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const check = { ...tr.receiptCheck, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('Travel Office returned expense claim', 'Travel', travelId, comment || 'Questions / missing documents');
        notify({ userId: tr.requesterId, title: 'Expense claim returned', message: `${tr.destination} — ${comment || 'Missing documentation'}`, module: 'Travel', targetId: travelId });
        showToast('Returned with questions / missing documents', 'warn');
        persistUpdate(TABLES.travelRequests, travelId, { receipt_check: check, status: 'reimbursement_hold' }, 'travel request');
        return { ...tr, receiptCheck: check, status: 'reimbursement_hold' };
      }
      log('Travel Office cleared receipts against itinerary & policy', 'Travel', travelId, comment || tr.destination);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Reimbursement awaiting payment', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: travelId });
      showToast('Receipts checked — forwarded to Finance Manager for payment');
      persistUpdate(TABLES.travelRequests, travelId, { receipt_check: check, status: 'pending_payment' }, 'travel request');
      return { ...tr, receiptCheck: check, status: 'pending_payment' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Stage 7 (post-travel) — Finance Manager: record expense in finance system and issue payment.
  const financeManagerPay = useCallback((travelId) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const total = tr.expenses.reduce((s, e) => s + e.amount, 0);
      const expenses = tr.expenses.map((e) => ({ ...e, status: 'approved' }));
      supabase.from(TABLES.travelExpenses).update({ status: 'approved' }).eq('travel_request_id', travelId)
        .then(({ error }) => { if (error) persistError(error, 'expense status'); });
      const reimbursement = { status: 'paid', amount: total, processedDate: today(), processedBy: currentUser.name };
      log('Recorded expense & issued payment', 'Travel', travelId, `Paid R${total.toLocaleString()} to ${tr.requesterName}`);
      notify({ userId: tr.requesterId, title: 'Reimbursement paid', message: `R${total.toLocaleString()} for ${tr.destination}`, module: 'Travel', targetId: travelId });
      showToast('Reimbursement processed');
      persistUpdate(TABLES.travelRequests, travelId, { status: 'completed', reimbursement }, 'reimbursement');
      return { ...tr, expenses, status: 'completed', reimbursement };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, persistError]);

  // ---------- Finance Hub: Requests (FIN-01/02/03) ----------
  // Shared five-stage chain — Line Manager -> Bookkeeper -> Accountant -> CEO -> payment
  // — used by all eight request types (Payment/APR/OPR/IPR/BPR/DPR/DST/OST). APR
  // additionally routes through an Entrepreneur Development Advisor and a Mentor before
  // Line Manager review (added at Brent's direction; not in the source diagram — see
  // permissions.js header). Every return path leads back to the requester, who edits and
  // resubmits, restarting at the first stage of whichever chain applies.
  const submitFinanceRequest = useCallback((data) => {
    const isApr = data.requestType === 'apr';
    const status = isApr ? 'pending_eda' : 'pending_line_manager';
    const fr = {
      id: nextId('FR'),
      submittedBy: currentUser.name,
      submittedById: currentUser.id,
      submittedDate: today(),
      status,
      eda: { approverId: null, approverName: '', status: isApr ? 'pending' : 'not_applicable', date: null, comment: '' },
      mentor: { approverId: null, approverName: '', status: 'not_applicable', date: null, comment: '' },
      lineManager: { approverId: null, approverName: '', status: isApr ? 'not_started' : 'pending', date: null, comment: '' },
      bookkeeperVerification: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      accountantReview: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      ceo: { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
      payment: { status: 'not_started', reference: null, processedBy: null, processedDate: null },
      returnCount: 0,
      ...data,
    };
    const budget = budgets.find((b) => b.id === data.budgetId);
    const newCommitted = budget ? budget.committed + data.amount : data.amount;
    setBudgets((prev) => prev.map((b) => (b.id === data.budgetId ? { ...b, committed: newCommitted } : b)));
    setFinanceRequests((prev) => [fr, ...prev]);
    log('Submitted Finance Hub request', 'Finance', fr.id, `${data.vendor || data.description} — R${data.amount.toLocaleString()}`);
    notify({
      role: isApr ? ROLES.ENTREPRENEUR_DEV_ADVISOR : ROLES.LINE_MANAGER,
      title: isApr ? 'APR awaiting Entrepreneur Development Advisor review' : 'Request awaiting Line Manager review',
      message: `${data.vendor || data.description} — R${data.amount.toLocaleString()}`, module: 'Finance', targetId: fr.id,
    });
    showToast('Request submitted');
    persistInsert(TABLES.financeRequests, {
      id: fr.id, request_type: fr.requestType, vendor: fr.vendor, description: fr.description, category: fr.category,
      amount: fr.amount, budget_id: fr.budgetId, linked_travel_request_id: fr.linkedTravelRequestId || null,
      procurement_ref: fr.procurementRef || '', beneficiary_development_plan: fr.beneficiaryDevelopmentPlan || '',
      submitted_by: fr.submittedBy, submitted_by_id: fr.submittedById, submitted_date: fr.submittedDate, status: fr.status,
      eda: fr.eda, mentor: fr.mentor, line_manager: fr.lineManager, bookkeeper_verification: fr.bookkeeperVerification,
      accountant_review: fr.accountantReview, ceo: fr.ceo, payment: fr.payment, return_count: fr.returnCount,
    }, 'finance request');
    persistUpdate(TABLES.budgets, data.budgetId, { committed: newCommitted }, 'budget commitment');
  }, [currentUser, budgets, log, notify, showToast, persistInsert, persistUpdate]);

  // Releases a request's committed budget — used whenever a pre-CEO stage rejects it.
  const releaseCommitted = useCallback((fr) => {
    const budget = budgets.find((b) => b.id === fr.budgetId);
    const newCommitted = budget ? Math.max(0, budget.committed - fr.amount) : 0;
    setBudgets((prevB) => prevB.map((b) => (b.id === fr.budgetId ? { ...b, committed: newCommitted } : b)));
    persistUpdate(TABLES.budgets, fr.budgetId, { committed: newCommitted }, 'budget commitment');
  }, [budgets, persistUpdate]);

  // Stage 0a (APR only) — Entrepreneur Development Advisor review.
  const edaReview = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const eda = { ...fr.eda, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        releaseCommitted(fr);
        log('Entrepreneur Development Advisor returned APR', 'Finance', id, comment || 'Not aligned with beneficiary development plan');
        notify({ userId: fr.submittedById, title: 'Request returned', message: `${fr.vendor || fr.description} — ${comment || 'Returned by Entrepreneur Development Advisor'}`, module: 'Finance', targetId: id });
        showToast('Request returned to requester', 'warn');
        persistUpdate(TABLES.financeRequests, id, { eda, status: 'returned_by_eda' }, 'finance request');
        return { ...fr, eda, status: 'returned_by_eda' };
      }
      const mentor = { ...fr.mentor, status: 'pending' };
      log('Entrepreneur Development Advisor approved APR', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.MENTOR, title: 'APR awaiting Mentor approval', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded to Mentor');
      persistUpdate(TABLES.financeRequests, id, { eda, mentor, status: 'pending_mentor' }, 'finance request');
      return { ...fr, eda, mentor, status: 'pending_mentor' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, releaseCommitted]);

  // Stage 0b (APR only) — Mentor approval.
  const mentorApprove = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const mentor = { ...fr.mentor, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        releaseCommitted(fr);
        log('Mentor returned APR', 'Finance', id, comment || 'Not endorsed');
        notify({ userId: fr.submittedById, title: 'Request returned', message: `${fr.vendor || fr.description} — ${comment || 'Returned by Mentor'}`, module: 'Finance', targetId: id });
        showToast('Request returned to requester', 'warn');
        persistUpdate(TABLES.financeRequests, id, { mentor, status: 'returned_by_mentor' }, 'finance request');
        return { ...fr, mentor, status: 'returned_by_mentor' };
      }
      const lineManager = { ...fr.lineManager, status: 'pending' };
      log('Mentor endorsed APR', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.LINE_MANAGER, title: 'Request awaiting Line Manager review', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Endorsed — forwarded to Line Manager');
      persistUpdate(TABLES.financeRequests, id, { mentor, line_manager: lineManager, status: 'pending_line_manager' }, 'finance request');
      return { ...fr, mentor, lineManager, status: 'pending_line_manager' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, releaseCommitted]);

  // Stage 1 — Line Manager: budget availability and business justification.
  const lineManagerReview = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const lineManager = { ...fr.lineManager, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        releaseCommitted(fr);
        log('Line Manager returned request', 'Finance', id, comment || 'Budget or justification not confirmed');
        notify({ userId: fr.submittedById, title: 'Request returned', message: `${fr.vendor || fr.description} — ${comment || 'Returned by Line Manager'}`, module: 'Finance', targetId: id });
        showToast('Request returned to requester', 'warn');
        persistUpdate(TABLES.financeRequests, id, { line_manager: lineManager, status: 'returned_by_line_manager' }, 'finance request');
        return { ...fr, lineManager, status: 'returned_by_line_manager' };
      }
      const bookkeeperVerification = { ...fr.bookkeeperVerification, status: 'pending' };
      log('Line Manager approved — budget & justification confirmed', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.BOOKKEEPER_FINANCE, title: 'Request awaiting Bookkeeper verification', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded to Bookkeeper for verification');
      persistUpdate(TABLES.financeRequests, id, { line_manager: lineManager, bookkeeper_verification: bookkeeperVerification, status: 'pending_bookkeeper_verification' }, 'finance request');
      return { ...fr, lineManager, bookkeeperVerification, status: 'pending_bookkeeper_verification' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, releaseCommitted]);

  // Stage 2 — Bookkeeper: documentation completeness, coding, policy compliance.
  const bookkeeperVerify = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const bookkeeperVerification = { ...fr.bookkeeperVerification, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        releaseCommitted(fr);
        log('Bookkeeper returned request — corrections needed', 'Finance', id, comment || 'Failed verification');
        notify({ userId: fr.submittedById, title: 'Request returned for corrections', message: `${fr.vendor || fr.description} — ${comment || 'Returned by Bookkeeper'}`, module: 'Finance', targetId: id });
        showToast('Request returned for corrections', 'warn');
        persistUpdate(TABLES.financeRequests, id, { bookkeeper_verification: bookkeeperVerification, status: 'returned_by_bookkeeper' }, 'finance request');
        return { ...fr, bookkeeperVerification, status: 'returned_by_bookkeeper' };
      }
      const accountantReview = { ...fr.accountantReview, status: 'pending' };
      log('Bookkeeper passed verification', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.ACCOUNTANT, title: 'Request awaiting Accountant review', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Verified — forwarded to Accountant');
      persistUpdate(TABLES.financeRequests, id, { bookkeeper_verification: bookkeeperVerification, accountant_review: accountantReview, status: 'pending_accountant_review' }, 'finance request');
      return { ...fr, bookkeeperVerification, accountantReview, status: 'pending_accountant_review' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, releaseCommitted]);

  // Stage 3 — Accountant: financial accuracy, budget availability, GL coding. Approval is
  // where the committed amount becomes a confirmed spend (mirrors Travel's Finance Manager stage).
  const accountantReview = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const accountantReviewObj = { ...fr.accountantReview, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        releaseCommitted(fr);
        log('Accountant returned request', 'Finance', id, comment || 'Financial accuracy or GL coding issue');
        notify({ userId: fr.submittedById, title: 'Request returned', message: `${fr.vendor || fr.description} — ${comment || 'Returned by Accountant'}`, module: 'Finance', targetId: id });
        showToast('Request returned to requester', 'warn');
        persistUpdate(TABLES.financeRequests, id, { accountant_review: accountantReviewObj, status: 'returned_by_accountant' }, 'finance request');
        return { ...fr, accountantReview: accountantReviewObj, status: 'returned_by_accountant' };
      }
      const budget = budgets.find((b) => b.id === fr.budgetId);
      const newCommitted = budget ? Math.max(0, budget.committed - fr.amount) : 0;
      const newSpent = budget ? budget.spent + fr.amount : fr.amount;
      setBudgets((prevB) => prevB.map((b) => (b.id === fr.budgetId ? { ...b, committed: newCommitted, spent: newSpent } : b)));
      const ceo = { ...fr.ceo, status: 'pending' };
      log('Accountant approved — within budget & policy', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.CEO, title: 'Request awaiting CEO approval', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded to CEO');
      persistUpdate(TABLES.financeRequests, id, { accountant_review: accountantReviewObj, ceo, status: 'pending_ceo' }, 'finance request');
      persistUpdate(TABLES.budgets, fr.budgetId, { committed: newCommitted, spent: newSpent }, 'budget totals');
      return { ...fr, accountantReview: accountantReviewObj, ceo, status: 'pending_ceo' };
    }));
  }, [currentUser, budgets, log, notify, showToast, persistUpdate, releaseCommitted]);

  // Stage 4 — CEO final approval. A decline here reverses the spend Accountant already recorded.
  const financeCeoApprove = useCallback((id, approve, comment) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const ceo = { ...fr.ceo, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        const budget = budgets.find((b) => b.id === fr.budgetId);
        const newSpent = budget ? Math.max(0, budget.spent - fr.amount) : 0;
        setBudgets((prevB) => prevB.map((b) => (b.id === fr.budgetId ? { ...b, spent: newSpent } : b)));
        persistUpdate(TABLES.budgets, fr.budgetId, { spent: newSpent }, 'budget totals');
        log('CEO declined request', 'Finance', id, comment || 'No comment provided');
        notify({ userId: fr.submittedById, title: 'Request declined', message: `${fr.vendor || fr.description} — ${comment || 'Declined by CEO'}`, module: 'Finance', targetId: id });
        showToast('Request declined', 'warn');
        persistUpdate(TABLES.financeRequests, id, { ceo, status: 'returned_by_ceo' }, 'finance request');
        return { ...fr, ceo, status: 'returned_by_ceo' };
      }
      const payment = { ...fr.payment, status: 'pending' };
      log('CEO approved request', 'Finance', id, comment || fr.vendor);
      notify({ role: ROLES.BOOKKEEPER_FINANCE, title: 'Request awaiting payment', message: `${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded to Bookkeeper for payment');
      persistUpdate(TABLES.financeRequests, id, { ceo, payment, status: 'pending_payment' }, 'finance request');
      return { ...fr, ceo, payment, status: 'pending_payment' };
    }));
  }, [currentUser, budgets, log, notify, showToast, persistUpdate]);

  // Stage 5 — Bookkeeper: process and record the payment.
  const processPayment = useCallback((id, reference) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const payment = { status: 'paid', reference: reference || null, processedBy: currentUser.name, processedDate: today() };
      log('Processed and recorded payment', 'Finance', id, `${fr.vendor || fr.description} — R${fr.amount.toLocaleString()}${reference ? ` · ${reference}` : ''}`);
      notify({ userId: fr.submittedById, title: 'Payment processed', message: `R${fr.amount.toLocaleString()} — ${fr.vendor || fr.description}`, module: 'Finance', targetId: id });
      showToast('Payment processed and recorded');
      persistUpdate(TABLES.financeRequests, id, { payment, status: 'completed' }, 'finance request');
      return { ...fr, payment, status: 'completed' };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate]);

  // Requester edits a returned request and resubmits — restarts at the first stage of
  // whichever chain applies (Entrepreneur Dev. Advisor for APR, otherwise Line Manager),
  // matching the source diagram where every return path leads back to "submit request form".
  const resubmitFinanceRequest = useCallback((id, patch) => {
    setFinanceRequests((prev) => prev.map((fr) => {
      if (fr.id !== id) return fr;
      const merged = { ...fr, ...patch, amount: patch.amount != null ? Number(patch.amount) : fr.amount };
      const isApr = merged.requestType === 'apr';
      const budget = budgets.find((b) => b.id === merged.budgetId);
      const newCommitted = budget ? budget.committed + merged.amount : merged.amount;
      setBudgets((prevB) => prevB.map((b) => (b.id === merged.budgetId ? { ...b, committed: newCommitted } : b)));
      const status = isApr ? 'pending_eda' : 'pending_line_manager';
      const eda = { approverId: null, approverName: '', status: isApr ? 'pending' : 'not_applicable', date: null, comment: '' };
      const mentor = { approverId: null, approverName: '', status: 'not_applicable', date: null, comment: '' };
      const lineManager = { approverId: null, approverName: '', status: isApr ? 'not_started' : 'pending', date: null, comment: '' };
      const bookkeeperVerification = { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' };
      const accountantReviewObj = { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' };
      const ceo = { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' };
      const returnCount = (fr.returnCount || 0) + 1;
      log('Resubmitted request', 'Finance', id, `${merged.vendor || merged.description} — R${merged.amount.toLocaleString()}`);
      notify({
        role: isApr ? ROLES.ENTREPRENEUR_DEV_ADVISOR : ROLES.LINE_MANAGER,
        title: isApr ? 'APR resubmitted — awaiting Entrepreneur Development Advisor review' : 'Request resubmitted — awaiting Line Manager review',
        message: `${merged.vendor || merged.description}`, module: 'Finance', targetId: id,
      });
      showToast('Request resubmitted');
      persistUpdate(TABLES.financeRequests, id, {
        vendor: merged.vendor, description: merged.description, category: merged.category, amount: merged.amount,
        budget_id: merged.budgetId, procurement_ref: merged.procurementRef || '', beneficiary_development_plan: merged.beneficiaryDevelopmentPlan || '',
        eda, mentor, line_manager: lineManager, bookkeeper_verification: bookkeeperVerification, accountant_review: accountantReviewObj, ceo,
        status, return_count: returnCount,
      }, 'finance request');
      persistUpdate(TABLES.budgets, merged.budgetId, { committed: newCommitted }, 'budget commitment');
      return { ...merged, eda, mentor, lineManager, bookkeeperVerification, accountantReview: accountantReviewObj, ceo, status, returnCount };
    }));
  }, [budgets, log, notify, showToast, persistUpdate]);

  // ---------- Document Control ----------
  const uploadDocument = useCallback((data) => {
    const doc = {
      id: nextId('DOC'),
      uploadedBy: currentUser.name,
      uploadDate: today(),
      status: 'pending_review',
      currentVersion: 1,
      complianceChecked: false,
      viewRoles: Object.values(ROLES),
      editRoles: ['admin'],
      versions: [],
      ...data,
    };
    doc.versions = [{ version: 1, date: today(), uploadedBy: currentUser.name, fileName: data.fileName, changeSummary: 'Initial upload.' }];
    setDocuments((prev) => [doc, ...prev]);
    log('Uploaded document', 'Documents', doc.id, `${data.title} (v1)`);
    notify({ role: ROLES.FINANCE_MANAGER, title: 'Document awaiting review', message: data.title, module: 'Documents', targetId: doc.id });
    showToast('Document uploaded');
    persistInsert(TABLES.documents, {
      id: doc.id, title: doc.title, type: doc.type, owner: doc.owner, uploaded_by: doc.uploadedBy, upload_date: doc.uploadDate,
      status: doc.status, current_version: doc.currentVersion, compliance_checked: doc.complianceChecked,
      retention_date: doc.retentionDate || null, view_roles: doc.viewRoles, edit_roles: doc.editRoles, tags: doc.tags || [],
    }, 'document');
    persistInsert(TABLES.documentVersions, {
      document_id: doc.id, version: 1, date: doc.uploadDate, uploaded_by: doc.uploadedBy, file_name: data.fileName, change_summary: 'Initial upload.',
    }, 'document version');
  }, [currentUser, log, notify, showToast, persistInsert]);

  const addDocumentVersion = useCallback((id, versionData) => {
    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== id) return doc;
      const version = doc.currentVersion + 1;
      const v = { version, date: today(), uploadedBy: currentUser.name, ...versionData };
      log('Uploaded new version', 'Documents', id, `${doc.title} (v${version})`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'New document version awaiting review', message: `${doc.title} (v${version})`, module: 'Documents', targetId: id });
      showToast(`New version (v${version}) uploaded`);
      persistUpdate(TABLES.documents, id, { current_version: version, status: 'pending_review' }, 'document');
      persistInsert(TABLES.documentVersions, {
        document_id: id, version, date: v.date, uploaded_by: v.uploadedBy, file_name: v.fileName, change_summary: v.changeSummary,
      }, 'document version');
      return { ...doc, currentVersion: version, status: 'pending_review', versions: [...doc.versions, v] };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, persistInsert]);

  const reviewDocument = useCallback((id, approve, comment) => {
    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== id) return doc;
      if (!approve) {
        log('Rejected document', 'Documents', id, comment || 'Returned for revision');
        showToast('Document returned for revision', 'warn');
        persistUpdate(TABLES.documents, id, { status: 'rejected', review_note: comment }, 'document');
        return { ...doc, status: 'rejected', reviewNote: comment };
      }
      log('Approved document', 'Documents', id, `${doc.title} (v${doc.currentVersion})`);
      showToast('Document approved');
      persistUpdate(TABLES.documents, id, { status: 'approved', compliance_checked: true, review_note: '' }, 'document');
      return { ...doc, status: 'approved', complianceChecked: true, reviewNote: '' };
    }));
  }, [log, showToast, persistUpdate]);

  const archiveDocument = useCallback((id) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status: 'archived' } : doc)));
    log('Archived document', 'Documents', id, 'Moved to archive / retention hold');
    showToast('Document archived');
    persistUpdate(TABLES.documents, id, { status: 'archived' }, 'document');
  }, [log, showToast, persistUpdate]);

  // ---------- Admin: Users ----------
  const addUser = useCallback((data) => {
    const u = { id: nextId('u'), initials: data.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(), active: true, ...data };
    setUsers((prev) => [...prev, u]);
    log('Created user account', 'Admin', u.id, `${u.name} — ${u.role}`);
    showToast('User created');
    persistInsert(TABLES.users, {
      id: u.id, name: u.name, email: u.email, role: u.role, department: u.department, title: u.title, active: u.active, initials: u.initials,
    }, 'user account');
  }, [log, showToast, persistInsert]);

  const updateUserRole = useCallback((id, newRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    log('Changed user role', 'Admin', id, `New role: ${newRole}`);
    showToast('User role updated');
    persistUpdate(TABLES.users, id, { role: newRole }, 'user role');
  }, [log, showToast, persistUpdate]);

  // ---------- Admin: Permissions (Admin -> Permissions screen) ----------
  const updatePermission = useCallback((targetRole, module, action, value) => {
    setRolePermissions((prev) => {
      const base = prev[targetRole] || DEFAULT_PERMISSIONS[targetRole] || {};
      const next = { ...prev, [targetRole]: { ...base, [module]: { ...base[module], [action]: value } } };
      persistUpdate(TABLES.rolePermissions, targetRole, {
        permissions: next[targetRole], updated_at: new Date().toISOString(), updated_by: currentUser.name,
      }, 'permission', 'role');
      return next;
    });
    log('Changed permission', 'Admin', targetRole, `${module}.${action} → ${value ? 'allowed' : 'denied'}`);
    showToast('Permission updated');
  }, [currentUser, log, showToast, persistUpdate]);

  const updateViewScope = useCallback((targetRole, module, value) => {
    setRolePermissions((prev) => {
      const base = prev[targetRole] || DEFAULT_PERMISSIONS[targetRole] || {};
      const next = { ...prev, [targetRole]: { ...base, [module]: { ...base[module], view: value } } };
      persistUpdate(TABLES.rolePermissions, targetRole, {
        permissions: next[targetRole], updated_at: new Date().toISOString(), updated_by: currentUser.name,
      }, 'permission', 'role');
      return next;
    });
    log('Changed view scope', 'Admin', targetRole, `${module}.view → ${value}`);
    showToast('Permission updated');
  }, [currentUser, log, showToast, persistUpdate]);

  const toggleUserActive = useCallback((id) => {
    const u = users.find((x) => x.id === id);
    const newActive = !u?.active;
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, active: newActive } : x)));
    log(u?.active ? 'Deactivated user' : 'Activated user', 'Admin', id, u?.name || id);
    showToast(u?.active ? 'User deactivated' : 'User activated');
    persistUpdate(TABLES.users, id, { active: newActive }, 'user status');
  }, [users, log, showToast, persistUpdate]);

  // ---------- Derived: pending action items per role (drives dashboards + notification bell) ----------
  const pendingActions = useMemo(() => {
    const items = [];
    if (canWith(effectivePermissions, role, 'travel', 'hodReview')) {
      travelRequests.filter((tr) => tr.status === 'pending_hod').forEach((tr) => {
        items.push({ id: `hod-${tr.id}`, module: 'Travel', label: `HOD review — ${tr.requesterName}`, detail: `${tr.destination} · R${tr.estimatedCost.toLocaleString()}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'qualityReview')) {
      travelRequests.filter((tr) => tr.status === 'pending_quality').forEach((tr) => {
        items.push({ id: `qr-${tr.id}`, module: 'Travel', label: `Quality review — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'book')) {
      travelRequests.filter((tr) => tr.status === 'pending_booking').forEach((tr) => {
        items.push({ id: `bk-${tr.id}`, module: 'Travel', label: `Ready to book — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
      travelRequests.filter((tr) => tr.status === 'finance_hold').forEach((tr) => {
        items.push({ id: `fh-${tr.id}`, module: 'Travel', label: `Finance hold — ${tr.requesterName}`, detail: `${tr.destination} · ${tr.financeReview.comment || 'returned by Finance Manager'}`, targetId: tr.id, priority: 'high' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'financeReview')) {
      travelRequests.filter((tr) => tr.status === 'pending_finance_review').forEach((tr) => {
        items.push({ id: `fr-${tr.id}`, module: 'Travel', label: `Financial review — ${tr.requesterName}`, detail: `${tr.destination} · R${(tr.booking.actualCost || tr.estimatedCost).toLocaleString()}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'ceoApprove')) {
      travelRequests.filter((tr) => tr.status === 'pending_ceo').forEach((tr) => {
        items.push({ id: `ceo-${tr.id}`, module: 'Travel', label: `CEO approval — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'boardSign')) {
      travelRequests.filter((tr) => tr.status === 'pending_board').forEach((tr) => {
        items.push({ id: `bt-${tr.id}`, module: 'Travel', label: `Board Treasurer counter-signature — ${tr.requesterName}`, detail: `${tr.destination} · R${(tr.booking.actualCost || tr.estimatedCost).toLocaleString()}`, targetId: tr.id, priority: 'high' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'receiptCheck')) {
      travelRequests.filter((tr) => tr.status === 'expense_review').forEach((tr) => {
        items.push({ id: `rc-${tr.id}`, module: 'Travel', label: `Receipt check — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'travel', 'pay')) {
      travelRequests.filter((tr) => tr.status === 'pending_payment').forEach((tr) => {
        items.push({ id: `pay-${tr.id}`, module: 'Travel', label: `Issue payment — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'edaReview')) {
      financeRequests.filter((fr) => fr.status === 'pending_eda').forEach((fr) => {
        items.push({ id: `eda-${fr.id}`, module: 'Finance', label: `EDA review — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'mentorApprove')) {
      financeRequests.filter((fr) => fr.status === 'pending_mentor').forEach((fr) => {
        items.push({ id: `mnt-${fr.id}`, module: 'Finance', label: `Mentor approval — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'lineManagerReview')) {
      financeRequests.filter((fr) => fr.status === 'pending_line_manager').forEach((fr) => {
        items.push({ id: `lm-${fr.id}`, module: 'Finance', label: `Line Manager review — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'bookkeeperVerify')) {
      financeRequests.filter((fr) => fr.status === 'pending_bookkeeper_verification').forEach((fr) => {
        items.push({ id: `bkv-${fr.id}`, module: 'Finance', label: `Bookkeeper verification — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
      financeRequests.filter((fr) => fr.status === 'pending_payment').forEach((fr) => {
        items.push({ id: `paypf-${fr.id}`, module: 'Finance', label: `Issue payment — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'accountantReview')) {
      financeRequests.filter((fr) => fr.status === 'pending_accountant_review').forEach((fr) => {
        items.push({ id: `acr-${fr.id}`, module: 'Finance', label: `Accountant review — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    if (canWith(effectivePermissions, role, 'finance', 'ceoApprove')) {
      financeRequests.filter((fr) => fr.status === 'pending_ceo').forEach((fr) => {
        items.push({ id: `fceo-${fr.id}`, module: 'Finance', label: `CEO approval — ${fr.vendor || fr.description}`, detail: `R${fr.amount.toLocaleString()}`, targetId: fr.id, priority: 'normal' });
      });
    }
    financeRequests.filter((fr) => fr.submittedById === currentUser.id && String(fr.status || '').startsWith('returned_by_')).forEach((fr) => {
      const stageComment = fr.eda?.comment || fr.mentor?.comment || fr.lineManager?.comment || fr.bookkeeperVerification?.comment || fr.accountantReview?.comment || fr.ceo?.comment || '';
      items.push({ id: `frret-${fr.id}`, module: 'Finance', label: `Returned for corrections — ${fr.vendor || fr.description}`, detail: stageComment || 'Edit and resubmit', targetId: fr.id, priority: 'high' });
    });
    if (canWith(effectivePermissions, role, 'documents', 'review')) {
      documents.filter((d) => d.status === 'pending_review').forEach((d) => {
        items.push({ id: `dr-${d.id}`, module: 'Documents', label: `Review — ${d.title}`, detail: `v${d.currentVersion} · ${d.type}`, targetId: d.id, priority: 'normal' });
      });
    }
    travelRequests.filter((tr) => tr.requesterId === currentUser.id && tr.status === 'rejected').forEach((tr) => {
      items.push({ id: `rj-${tr.id}`, module: 'Travel', label: `Rejected — ${tr.destination}`, detail: tr.hod.comment || tr.travelOffice.comment || tr.ceo.comment || tr.boardTreasurer.comment || '', targetId: tr.id, priority: 'low' });
    });
    travelRequests.filter((tr) => tr.requesterId === currentUser.id && tr.status === 'reimbursement_hold').forEach((tr) => {
      items.push({ id: `reh-${tr.id}`, module: 'Travel', label: `Expense claim needs corrections — ${tr.destination}`, detail: tr.receiptCheck.comment || 'Missing documentation', targetId: tr.id, priority: 'normal' });
    });
    travelRequests.filter((tr) => tr.requesterId === currentUser.id && tr.status === 'cleared_for_travel').forEach((tr) => {
      items.push({ id: `cl-${tr.id}`, module: 'Travel', label: `Cleared for travel — ${tr.destination}`, detail: 'Retain receipts and submit an expense claim afterward', targetId: tr.id, priority: 'low' });
    });
    return items;
  }, [role, currentUser, travelRequests, financeRequests, documents, effectivePermissions]);

  const myNotifications = useMemo(() => {
    return notifications.filter((n) => (n.role && n.role === role) || (n.userId && n.userId === currentUser.id));
  }, [notifications, role, currentUser]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ((n.role === role || n.userId === currentUser.id) ? { ...n, read: true } : n)));
  }, [role, currentUser]);

  const value = {
    currentUser, role, users, switchRole, demoRoster,
    loading, loadError,
    budgets, createBudget, adjustBudgetAllocation, budgetAvailable,
    travelRequests, submitTravelRequest, hodReview, qualityReview, confirmBooking, financeManagerReview, resolveFinanceHold,
    ceoApprove, boardTreasurerSign, submitExpense, receiptCheck, financeManagerPay,
    financeRequests, submitFinanceRequest, edaReview, mentorApprove, lineManagerReview, bookkeeperVerify, accountantReview, financeCeoApprove, processPayment, resubmitFinanceRequest,
    documents, uploadDocument, addDocumentVersion, reviewDocument, archiveDocument,
    addUser, updateUserRole, toggleUserActive,
    rolePermissions: effectivePermissions, updatePermission, updateViewScope,
    auditLog, pendingActions, myNotifications, markAllRead,
    toast, showToast,
    can: (module, action) => canWith(effectivePermissions, role, module, action),
    scope: (module) => viewScopeWith(effectivePermissions, role, module),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
