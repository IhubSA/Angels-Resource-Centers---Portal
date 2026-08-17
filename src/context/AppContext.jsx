import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROLES, can, viewScope } from '../data/permissions';
import { supabase, TABLES } from '../lib/supabaseClient';
import { mapUser, mapBudget, mapTravelRequest, mapInvoice, mapDocument, mapAuditLog } from '../lib/mappers';

const AppContext = createContext(null);

let idCounter = 2000;
const nextId = (prefix) => `${prefix}-${++idCounter}`;
const today = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5);
};

const FALLBACK_USER = { id: null, name: '', email: '', role: ROLES.STAFF, department: '', title: '', active: true, initials: '' };
const DEMO_ROLE_ORDER = [ROLES.ADMIN, ROLES.FINANCE_MANAGER, ROLES.PROGRAM_MANAGER, ROLES.STAFF, ROLES.AUDITOR];

export function AppProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState('u1');
  const [users, setUsers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [travelRequests, setTravelRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || users[0] || FALLBACK_USER, [users, currentUserId]);
  const role = currentUser.role;

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
        const [usersRes, budgetsRes, travelRes, expensesRes, invoicesRes, docsRes, versionsRes, auditRes] = await Promise.all([
          supabase.from(TABLES.users).select('*').order('id'),
          supabase.from(TABLES.budgets).select('*').order('id'),
          supabase.from(TABLES.travelRequests).select('*').order('created_date', { ascending: false }),
          supabase.from(TABLES.travelExpenses).select('*'),
          supabase.from(TABLES.invoices).select('*').order('submitted_date', { ascending: false }),
          supabase.from(TABLES.documents).select('*').order('upload_date', { ascending: false }),
          supabase.from(TABLES.documentVersions).select('*'),
          supabase.from(TABLES.auditLog).select('*').order('ts', { ascending: false }),
        ]);
        const firstError = [usersRes, budgetsRes, travelRes, expensesRes, invoicesRes, docsRes, versionsRes, auditRes]
          .map((r) => r.error).find(Boolean);
        if (firstError) throw firstError;
        if (cancelled) return;
        setUsers(usersRes.data.map(mapUser));
        setBudgets(budgetsRes.data.map(mapBudget));
        setTravelRequests(travelRes.data.map((r) => mapTravelRequest(r, expensesRes.data)));
        setInvoices(invoicesRes.data.map(mapInvoice));
        setDocuments(docsRes.data.map((d) => mapDocument(d, versionsRes.data)));
        setAuditLog(auditRes.data.map(mapAuditLog));
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

  const persistUpdate = useCallback((table, id, patch, what) => {
    supabase.from(table).update(patch).eq('id', id).then(({ error }) => { if (error) persistError(error, what); });
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
  const submitTravelRequest = useCallback((data) => {
    const selfApprove = role === ROLES.PROGRAM_MANAGER;
    const tr = {
      id: nextId('TR'),
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      department: currentUser.department,
      createdDate: today(),
      status: 'pending_level1',
      level1: selfApprove
        ? { approverId: 'system', approverName: 'Self-submitted (Program Manager)', status: 'approved', date: today(), comment: 'Auto-cleared — submitter holds Level 1 authority.' }
        : { approverId: null, approverName: 'David Okafor', status: 'pending', date: null, comment: '' },
      level2: { approverId: null, approverName: 'Sarah Naidoo', status: 'not_started', date: null, comment: '' },
      budgetCheck: null,
      booking: { confirmed: false, bookingRef: null, bookedDate: null, actualCost: null },
      expenses: [],
      reimbursement: { status: 'not_applicable', amount: 0, processedDate: null, processedBy: null },
      ...data,
    };

    let committedBudgetPatch = null;
    if (selfApprove) {
      const budget = budgets.find((b) => b.id === data.budgetId);
      const available = budget ? budgetAvailable(budget) : 0;
      const sufficient = budget ? available >= data.estimatedCost : false;
      tr.budgetCheck = { budgetId: data.budgetId, sufficient, availableAtCheck: available, checkedDate: today() };
      if (sufficient) {
        tr.status = 'pending_level2';
        const newCommitted = budget.committed + data.estimatedCost;
        setBudgets((prev) => prev.map((b) => (b.id === data.budgetId ? { ...b, committed: newCommitted } : b)));
        committedBudgetPatch = newCommitted;
      } else {
        tr.status = 'budget_hold';
      }
    }

    setTravelRequests((prev) => [tr, ...prev]);
    log('Submitted travel request', 'Travel', tr.id, `${data.destination} — estimated R${data.estimatedCost.toLocaleString()}`);
    notify({ role: ROLES.PROGRAM_MANAGER, title: 'Travel request awaiting Level 1 approval', message: `${tr.requesterName} — ${data.destination}`, module: 'Travel', targetId: tr.id });
    showToast('Travel request submitted');

    persistInsert(TABLES.travelRequests, {
      id: tr.id, requester_id: tr.requesterId, requester_name: tr.requesterName, department: tr.department,
      destination: tr.destination, purpose: tr.purpose, start_date: tr.startDate, end_date: tr.endDate,
      estimated_cost: tr.estimatedCost, budget_id: tr.budgetId, status: tr.status, created_date: tr.createdDate,
      level1: tr.level1, level2: tr.level2, budget_check: tr.budgetCheck, booking: tr.booking, reimbursement: tr.reimbursement,
    }, 'travel request');
    if (committedBudgetPatch !== null) {
      persistUpdate(TABLES.budgets, data.budgetId, { committed: committedBudgetPatch }, 'budget commitment');
    }
    return tr.id;
  }, [role, currentUser, budgets, budgetAvailable, log, notify, showToast, persistInsert, persistUpdate]);

  const approveTravelLevel1 = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const level1 = { ...tr.level1, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('Rejected travel request (Level 1)', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request rejected', message: `${tr.destination} — ${comment || 'Rejected at Level 1'}`, module: 'Travel', targetId: id });
        showToast('Travel request rejected', 'warn');
        persistUpdate(TABLES.travelRequests, id, { level1, status: 'rejected' }, 'travel request');
        return { ...tr, level1, status: 'rejected' };
      }
      const budget = budgets.find((b) => b.id === tr.budgetId);
      const available = budget ? budgetAvailable(budget) : 0;
      const sufficient = budget ? available >= tr.estimatedCost : false;
      const budgetCheck = { budgetId: tr.budgetId, sufficient, availableAtCheck: available, checkedDate: today() };
      log('Approved travel request (Level 1)', 'Travel', id, comment || `${tr.destination}`);
      if (sufficient) {
        const newCommitted = budget.committed + tr.estimatedCost;
        setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted } : b)));
        notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting Level 2 approval', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
        showToast('Approved — forwarded for Level 2 approval');
        persistUpdate(TABLES.travelRequests, id, { level1, budget_check: budgetCheck, status: 'pending_level2' }, 'travel request');
        persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted }, 'budget commitment');
        return { ...tr, level1, budgetCheck, status: 'pending_level2' };
      }
      log('Budget verification failed', 'Travel', id, `Insufficient funds in ${budget?.name || tr.budgetId}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request on budget hold', message: `${tr.destination} — insufficient funds`, module: 'Travel', targetId: id, priority: 'high' });
      showToast('Approved, but budget is insufficient — placed on hold', 'warn');
      persistUpdate(TABLES.travelRequests, id, { level1, budget_check: budgetCheck, status: 'budget_hold' }, 'travel request');
      return { ...tr, level1, budgetCheck, status: 'budget_hold' };
    }));
  }, [currentUser, budgets, budgetAvailable, log, notify, showToast, persistUpdate]);

  const approveTravelLevel2 = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const level2 = { ...tr.level2, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        const budget = budgets.find((b) => b.id === tr.budgetId);
        const newCommitted = budget ? Math.max(0, budget.committed - tr.estimatedCost) : 0;
        setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted } : b)));
        log('Rejected travel request (Level 2)', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request rejected', message: `${tr.destination} — ${comment || 'Rejected at Level 2'}`, module: 'Travel', targetId: id });
        showToast('Travel request rejected', 'warn');
        persistUpdate(TABLES.travelRequests, id, { level2, status: 'rejected' }, 'travel request');
        persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted }, 'budget commitment');
        return { ...tr, level2, status: 'rejected' };
      }
      log('Approved travel request (Level 2) — cleared for booking', 'Travel', id, comment || tr.destination);
      notify({ userId: tr.requesterId, title: 'Travel request approved', message: `${tr.destination} — cleared for booking`, module: 'Travel', targetId: id });
      showToast('Travel request fully approved');
      persistUpdate(TABLES.travelRequests, id, { level2, status: 'approved' }, 'travel request');
      return { ...tr, level2, status: 'approved' };
    }));
  }, [currentUser, budgets, log, notify, showToast, persistUpdate]);

  const releaseBudgetHold = useCallback((id, newBudgetId) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const budgetId = newBudgetId || tr.budgetId;
      const budget = budgets.find((b) => b.id === budgetId);
      const available = budget ? budgetAvailable(budget) : 0;
      const sufficient = budget ? available >= tr.estimatedCost : false;
      if (!sufficient) {
        showToast('Selected budget still has insufficient funds', 'warn');
        return tr;
      }
      const newCommitted = budget.committed + tr.estimatedCost;
      setBudgets((prevB) => prevB.map((b) => (b.id === budgetId ? { ...b, committed: newCommitted } : b)));
      const budgetCheck = { budgetId, sufficient: true, availableAtCheck: available, checkedDate: today() };
      log('Re-verified budget — released hold', 'Travel', id, `Reassigned to ${budget?.name || budgetId}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting Level 2 approval', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Budget hold released — forwarded for Level 2 approval');
      persistUpdate(TABLES.travelRequests, id, { budget_id: budgetId, budget_check: budgetCheck, status: 'pending_level2' }, 'travel request');
      persistUpdate(TABLES.budgets, budgetId, { committed: newCommitted }, 'budget commitment');
      return { ...tr, budgetId, budgetCheck, status: 'pending_level2' };
    }));
  }, [budgets, budgetAvailable, log, notify, showToast, persistUpdate]);

  const confirmBooking = useCallback((id, bookingRef, actualCost) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const budget = budgets.find((b) => b.id === tr.budgetId);
      const newCommitted = budget ? Math.max(0, budget.committed - tr.estimatedCost) : 0;
      const newSpent = budget ? budget.spent + actualCost : actualCost;
      setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: newCommitted, spent: newSpent } : b)));
      const booking = { confirmed: true, bookingRef, bookedDate: today(), actualCost };
      log('Confirmed booking', 'Travel', id, `${bookingRef} — actual cost R${actualCost.toLocaleString()}`);
      notify({ userId: tr.requesterId, title: 'Booking confirmed', message: `${tr.destination} — ref ${bookingRef}`, module: 'Travel', targetId: id });
      showToast('Booking confirmed');
      persistUpdate(TABLES.travelRequests, id, { status: 'booked', booking }, 'booking confirmation');
      persistUpdate(TABLES.budgets, tr.budgetId, { committed: newCommitted, spent: newSpent }, 'budget totals');
      return { ...tr, status: 'booked', booking };
    }));
  }, [budgets, log, notify, showToast, persistUpdate]);

  const submitExpense = useCallback((travelId, expense) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const ex = { id: nextId('EX'), submittedDate: today(), status: 'pending', ...expense };
      const newStatus = tr.status === 'booked' ? 'expense_review' : tr.status;
      log('Submitted expense', 'Travel', travelId, `${expense.category} — R${expense.amount.toLocaleString()}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Expense awaiting reimbursement review', message: `${tr.requesterName} — ${expense.category} R${expense.amount.toLocaleString()}`, module: 'Travel', targetId: travelId });
      showToast('Expense submitted with receipt');
      persistInsert(TABLES.travelExpenses, {
        id: ex.id, travel_request_id: travelId, category: ex.category, amount: ex.amount,
        description: ex.description, receipt_name: ex.receiptName, submitted_date: ex.submittedDate, status: ex.status,
      }, 'expense');
      if (newStatus !== tr.status) persistUpdate(TABLES.travelRequests, travelId, { status: newStatus }, 'travel request status');
      return { ...tr, expenses: [...tr.expenses, ex], status: newStatus };
    }));
  }, [log, notify, showToast, persistInsert, persistUpdate]);

  const processReimbursement = useCallback((travelId, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const total = tr.expenses.reduce((s, e) => s + e.amount, 0);
      const newExpenseStatus = approve ? 'approved' : 'rejected';
      const expenses = tr.expenses.map((e) => ({ ...e, status: newExpenseStatus }));
      supabase.from(TABLES.travelExpenses).update({ status: newExpenseStatus }).eq('travel_request_id', travelId)
        .then(({ error }) => { if (error) persistError(error, 'expense status'); });
      if (approve) {
        const reimbursement = { status: 'paid', amount: total, processedDate: today(), processedBy: currentUser.name };
        log('Processed reimbursement', 'Travel', travelId, `Paid R${total.toLocaleString()} to ${tr.requesterName}`);
        notify({ userId: tr.requesterId, title: 'Reimbursement paid', message: `R${total.toLocaleString()} for ${tr.destination}`, module: 'Travel', targetId: travelId });
        showToast('Reimbursement processed');
        persistUpdate(TABLES.travelRequests, travelId, { status: 'completed', reimbursement }, 'reimbursement');
        return { ...tr, expenses, status: 'completed', reimbursement };
      }
      const reimbursement = { status: 'rejected', amount: total, processedDate: today(), processedBy: currentUser.name };
      log('Rejected reimbursement', 'Travel', travelId, comment || 'Receipts insufficient');
      notify({ userId: tr.requesterId, title: 'Reimbursement rejected', message: comment || 'Please resubmit receipts', module: 'Travel', targetId: travelId });
      showToast('Reimbursement rejected', 'warn');
      persistUpdate(TABLES.travelRequests, travelId, { reimbursement }, 'reimbursement');
      return { ...tr, expenses, reimbursement };
    }));
  }, [currentUser, log, notify, showToast, persistUpdate, persistError]);

  // ---------- Finance: Invoices ----------
  const submitInvoice = useCallback((data) => {
    const inv = {
      id: nextId('INV'),
      submittedBy: currentUser.name,
      submittedDate: today(),
      status: 'pending_level1',
      level1: { approverName: 'Sarah Naidoo', status: 'pending', date: null, comment: '' },
      level2: { approverName: 'Thandiwe Mokoena', status: 'not_started', date: null, comment: '' },
      ...data,
    };
    const budget = budgets.find((b) => b.id === data.budgetId);
    const newCommitted = budget ? budget.committed + data.amount : data.amount;
    setBudgets((prev) => prev.map((b) => (b.id === data.budgetId ? { ...b, committed: newCommitted } : b)));
    setInvoices((prev) => [inv, ...prev]);
    log('Submitted invoice', 'Finance', inv.id, `${data.vendor} — R${data.amount.toLocaleString()}`);
    notify({ role: ROLES.FINANCE_MANAGER, title: 'Invoice awaiting Level 1 approval', message: `${data.vendor} — R${data.amount.toLocaleString()}`, module: 'Finance', targetId: inv.id });
    showToast('Invoice submitted');
    persistInsert(TABLES.invoices, {
      id: inv.id, vendor: inv.vendor, description: inv.description, category: inv.category, amount: inv.amount,
      budget_id: inv.budgetId, linked_travel_request_id: inv.linkedTravelRequestId || null, submitted_by: inv.submittedBy,
      submitted_date: inv.submittedDate, status: inv.status, level1: inv.level1, level2: inv.level2,
    }, 'invoice');
    persistUpdate(TABLES.budgets, data.budgetId, { committed: newCommitted }, 'budget commitment');
  }, [currentUser, budgets, log, notify, showToast, persistInsert, persistUpdate]);

  const approveInvoiceLevel1 = useCallback((id, approve, comment) => {
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv;
      const level1 = { ...inv.level1, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        const budget = budgets.find((b) => b.id === inv.budgetId);
        const newCommitted = budget ? Math.max(0, budget.committed - inv.amount) : 0;
        setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: newCommitted } : b)));
        log('Rejected invoice (Level 1)', 'Finance', id, comment || 'No comment provided');
        showToast('Invoice rejected', 'warn');
        persistUpdate(TABLES.invoices, id, { level1, status: 'rejected' }, 'invoice');
        persistUpdate(TABLES.budgets, inv.budgetId, { committed: newCommitted }, 'budget commitment');
        return { ...inv, level1, status: 'rejected' };
      }
      log('Approved invoice (Level 1)', 'Finance', id, comment || inv.vendor);
      notify({ role: ROLES.ADMIN, title: 'Invoice awaiting Level 2 approval', message: `${inv.vendor} — R${inv.amount.toLocaleString()}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded for Level 2 approval');
      persistUpdate(TABLES.invoices, id, { level1, status: 'pending_level2' }, 'invoice');
      return { ...inv, level1, status: 'pending_level2' };
    }));
  }, [budgets, log, notify, showToast, persistUpdate]);

  const approveInvoiceLevel2 = useCallback((id, approve, comment) => {
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv;
      const level2 = { ...inv.level2, status: approve ? 'approved' : 'rejected', date: today(), comment };
      const budget = budgets.find((b) => b.id === inv.budgetId);
      if (!approve) {
        const newCommitted = budget ? Math.max(0, budget.committed - inv.amount) : 0;
        setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: newCommitted } : b)));
        log('Rejected invoice (Level 2)', 'Finance', id, comment || 'No comment provided');
        showToast('Invoice rejected', 'warn');
        persistUpdate(TABLES.invoices, id, { level2, status: 'rejected' }, 'invoice');
        persistUpdate(TABLES.budgets, inv.budgetId, { committed: newCommitted }, 'budget commitment');
        return { ...inv, level2, status: 'rejected' };
      }
      const newCommitted = budget ? Math.max(0, budget.committed - inv.amount) : 0;
      const newSpent = budget ? budget.spent + inv.amount : inv.amount;
      setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: newCommitted, spent: newSpent } : b)));
      log('Approved invoice (Level 2) — payment released', 'Finance', id, `${inv.vendor} — R${inv.amount.toLocaleString()}`);
      showToast('Invoice approved — payment released');
      persistUpdate(TABLES.invoices, id, { level2, status: 'paid' }, 'invoice');
      persistUpdate(TABLES.budgets, inv.budgetId, { committed: newCommitted, spent: newSpent }, 'budget totals');
      return { ...inv, level2, status: 'paid' };
    }));
  }, [budgets, log, showToast, persistUpdate]);

  // ---------- Document Control ----------
  const uploadDocument = useCallback((data) => {
    const doc = {
      id: nextId('DOC'),
      uploadedBy: currentUser.name,
      uploadDate: today(),
      status: 'pending_review',
      currentVersion: 1,
      complianceChecked: false,
      viewRoles: ['admin', 'finance_manager', 'program_manager', 'staff', 'auditor'],
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
    if (can(role, 'travel', 'approveLevel1')) {
      travelRequests.filter((tr) => tr.status === 'pending_level1' && tr.level1.status === 'pending').forEach((tr) => {
        items.push({ id: `t1-${tr.id}`, module: 'Travel', label: `Level 1 approval — ${tr.requesterName}`, detail: `${tr.destination} · R${tr.estimatedCost.toLocaleString()}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (can(role, 'travel', 'approveLevel2')) {
      travelRequests.filter((tr) => tr.status === 'pending_level2').forEach((tr) => {
        items.push({ id: `t2-${tr.id}`, module: 'Travel', label: `Level 2 approval — ${tr.requesterName}`, detail: `${tr.destination} · R${tr.estimatedCost.toLocaleString()}`, targetId: tr.id, priority: 'normal' });
      });
      travelRequests.filter((tr) => tr.status === 'budget_hold').forEach((tr) => {
        items.push({ id: `bh-${tr.id}`, module: 'Travel', label: `Budget hold — ${tr.requesterName}`, detail: `${tr.destination} · insufficient funds`, targetId: tr.id, priority: 'high' });
      });
      travelRequests.filter((tr) => tr.expenses.some((e) => e.status === 'pending')).forEach((tr) => {
        items.push({ id: `re-${tr.id}`, module: 'Travel', label: `Reimbursement review — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (can(role, 'travel', 'book')) {
      travelRequests.filter((tr) => tr.status === 'approved').forEach((tr) => {
        items.push({ id: `bk-${tr.id}`, module: 'Travel', label: `Ready to book — ${tr.requesterName}`, detail: `${tr.destination}`, targetId: tr.id, priority: 'normal' });
      });
    }
    if (can(role, 'finance', 'approveLevel1')) {
      invoices.filter((inv) => inv.status === 'pending_level1').forEach((inv) => {
        items.push({ id: `i1-${inv.id}`, module: 'Finance', label: `Invoice Level 1 — ${inv.vendor}`, detail: `R${inv.amount.toLocaleString()}`, targetId: inv.id, priority: 'normal' });
      });
    }
    if (can(role, 'finance', 'approveLevel2')) {
      invoices.filter((inv) => inv.status === 'pending_level2').forEach((inv) => {
        items.push({ id: `i2-${inv.id}`, module: 'Finance', label: `Invoice Level 2 — ${inv.vendor}`, detail: `R${inv.amount.toLocaleString()}`, targetId: inv.id, priority: 'normal' });
      });
    }
    if (can(role, 'documents', 'review')) {
      documents.filter((d) => d.status === 'pending_review').forEach((d) => {
        items.push({ id: `dr-${d.id}`, module: 'Documents', label: `Review — ${d.title}`, detail: `v${d.currentVersion} · ${d.type}`, targetId: d.id, priority: 'normal' });
      });
    }
    if (role === ROLES.STAFF || role === ROLES.PROGRAM_MANAGER) {
      travelRequests.filter((tr) => tr.requesterId === currentUser.id && tr.status === 'rejected').forEach((tr) => {
        items.push({ id: `rj-${tr.id}`, module: 'Travel', label: `Rejected — ${tr.destination}`, detail: tr.level1.comment || tr.level2.comment, targetId: tr.id, priority: 'low' });
      });
      travelRequests.filter((tr) => tr.requesterId === currentUser.id && tr.status === 'approved').forEach((tr) => {
        items.push({ id: `ap-${tr.id}`, module: 'Travel', label: `Approved, awaiting booking — ${tr.destination}`, detail: 'Finance will confirm booking', targetId: tr.id, priority: 'low' });
      });
    }
    return items;
  }, [role, currentUser, travelRequests, invoices, documents]);

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
    travelRequests, submitTravelRequest, approveTravelLevel1, approveTravelLevel2, releaseBudgetHold, confirmBooking, submitExpense, processReimbursement,
    invoices, submitInvoice, approveInvoiceLevel1, approveInvoiceLevel2,
    documents, uploadDocument, addDocumentVersion, reviewDocument, archiveDocument,
    addUser, updateUserRole, toggleUserActive,
    auditLog, pendingActions, myNotifications, markAllRead,
    toast, showToast,
    can: (module, action) => can(role, module, action),
    scope: (module) => viewScope(role, module),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
