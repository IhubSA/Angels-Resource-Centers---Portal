import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_USERS, ALL_USERS, userById } from '../data/users';
import { ROLES, can, viewScope } from '../data/permissions';
import {
  initialBudgets,
  initialTravelRequests,
  initialInvoices,
  initialDocuments,
  initialAuditLog,
  budgetAvailable,
} from '../data/mockData';

const AppContext = createContext(null);

let idCounter = 2000;
const nextId = (prefix) => `${prefix}-${++idCounter}`;
const today = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10) + ' ' + d.toTimeString().slice(0, 5);
};

export function AppProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState('u1');
  const [users, setUsers] = useState(ALL_USERS);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [travelRequests, setTravelRequests] = useState(initialTravelRequests);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [documents, setDocuments] = useState(initialDocuments);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const currentUser = useMemo(() => users.find((u) => u.id === currentUserId) || users[0], [users, currentUserId]);
  const role = currentUser.role;

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() });
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 3500);
  }, []);

  const log = useCallback((action, module, targetId, details) => {
    setAuditLog((prev) => [
      { id: nextId('AL'), timestamp: nowStamp(), userName: currentUser.name, role: currentUser.role, action, module, targetId, details },
      ...prev,
    ]);
  }, [currentUser]);

  const notify = useCallback((entry) => {
    setNotifications((prev) => [
      { id: nextId('N'), date: nowStamp(), read: false, ...entry },
      ...prev,
    ]);
  }, []);

  const switchRole = useCallback((newRole) => {
    const u = DEMO_USERS.find((u) => u.role === newRole);
    if (u) setCurrentUserId(u.id);
  }, []);

  // ---------- Budgets ----------
  const createBudget = useCallback((data) => {
    const b = { id: nextId('B'), committed: 0, spent: 0, ...data };
    setBudgets((prev) => [b, ...prev]);
    log('Created budget', 'Finance', b.id, `${b.name} — allocated R${data.allocated.toLocaleString()}`);
    showToast(`Budget "${b.name}" created`);
  }, [log, showToast]);

  const adjustBudgetAllocation = useCallback((budgetId, newAllocated) => {
    setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, allocated: newAllocated } : b)));
    const b = budgets.find((x) => x.id === budgetId);
    log('Adjusted budget allocation', 'Finance', budgetId, `${b?.name || budgetId} — new allocation R${newAllocated.toLocaleString()}`);
    showToast('Budget allocation updated');
  }, [budgets, log, showToast]);

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

    if (selfApprove) {
      const budget = budgets.find((b) => b.id === data.budgetId);
      const available = budget ? budgetAvailable(budget) : 0;
      const sufficient = budget ? available >= data.estimatedCost : false;
      tr.budgetCheck = { budgetId: data.budgetId, sufficient, availableAtCheck: available, checkedDate: today() };
      if (sufficient) {
        tr.status = 'pending_level2';
        setBudgets((prev) => prev.map((b) => (b.id === data.budgetId ? { ...b, committed: b.committed + data.estimatedCost } : b)));
      } else {
        tr.status = 'budget_hold';
      }
    }

    setTravelRequests((prev) => [tr, ...prev]);
    log('Submitted travel request', 'Travel', tr.id, `${data.destination} — estimated R${data.estimatedCost.toLocaleString()}`);
    notify({ role: ROLES.PROGRAM_MANAGER, title: 'Travel request awaiting Level 1 approval', message: `${tr.requesterName} — ${data.destination}`, module: 'Travel', targetId: tr.id });
    showToast('Travel request submitted');
    return tr.id;
  }, [role, currentUser, budgets, log, notify, showToast]);

  const approveTravelLevel1 = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const level1 = { ...tr.level1, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        log('Rejected travel request (Level 1)', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request rejected', message: `${tr.destination} — ${comment || 'Rejected at Level 1'}`, module: 'Travel', targetId: id });
        showToast('Travel request rejected', 'warn');
        return { ...tr, level1, status: 'rejected' };
      }
      const budget = budgets.find((b) => b.id === tr.budgetId);
      const available = budget ? budgetAvailable(budget) : 0;
      const sufficient = budget ? available >= tr.estimatedCost : false;
      const budgetCheck = { budgetId: tr.budgetId, sufficient, availableAtCheck: available, checkedDate: today() };
      log('Approved travel request (Level 1)', 'Travel', id, comment || `${tr.destination}`);
      if (sufficient) {
        setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: b.committed + tr.estimatedCost } : b)));
        notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting Level 2 approval', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
        showToast('Approved — forwarded for Level 2 approval');
        return { ...tr, level1, budgetCheck, status: 'pending_level2' };
      }
      log('Budget verification failed', 'Travel', id, `Insufficient funds in ${budget?.name || tr.budgetId}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request on budget hold', message: `${tr.destination} — insufficient funds`, module: 'Travel', targetId: id, priority: 'high' });
      showToast('Approved, but budget is insufficient — placed on hold', 'warn');
      return { ...tr, level1, budgetCheck, status: 'budget_hold' };
    }));
  }, [currentUser, budgets, log, notify, showToast]);

  const approveTravelLevel2 = useCallback((id, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      const level2 = { ...tr.level2, approverId: currentUser.id, approverName: currentUser.name, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        setBudgets((prevB) => prevB.map((b) => (b.id === tr.budgetId ? { ...b, committed: Math.max(0, b.committed - tr.estimatedCost) } : b)));
        log('Rejected travel request (Level 2)', 'Travel', id, comment || 'No comment provided');
        notify({ userId: tr.requesterId, title: 'Travel request rejected', message: `${tr.destination} — ${comment || 'Rejected at Level 2'}`, module: 'Travel', targetId: id });
        showToast('Travel request rejected', 'warn');
        return { ...tr, level2, status: 'rejected' };
      }
      log('Approved travel request (Level 2) — cleared for booking', 'Travel', id, comment || tr.destination);
      notify({ userId: tr.requesterId, title: 'Travel request approved', message: `${tr.destination} — cleared for booking`, module: 'Travel', targetId: id });
      showToast('Travel request fully approved');
      return { ...tr, level2, status: 'approved' };
    }));
  }, [currentUser, log, notify, showToast]);

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
      setBudgets((prevB) => prevB.map((b) => (b.id === budgetId ? { ...b, committed: b.committed + tr.estimatedCost } : b)));
      log('Re-verified budget — released hold', 'Travel', id, `Reassigned to ${budget?.name || budgetId}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Travel request awaiting Level 2 approval', message: `${tr.requesterName} — ${tr.destination}`, module: 'Travel', targetId: id });
      showToast('Budget hold released — forwarded for Level 2 approval');
      return { ...tr, budgetId, budgetCheck: { budgetId, sufficient: true, availableAtCheck: available, checkedDate: today() }, status: 'pending_level2' };
    }));
  }, [budgets, log, notify, showToast]);

  const confirmBooking = useCallback((id, bookingRef, actualCost) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== id) return tr;
      setBudgets((prevB) => prevB.map((b) => {
        if (b.id !== tr.budgetId) return b;
        return { ...b, committed: Math.max(0, b.committed - tr.estimatedCost), spent: b.spent + actualCost };
      }));
      log('Confirmed booking', 'Travel', id, `${bookingRef} — actual cost R${actualCost.toLocaleString()}`);
      notify({ userId: tr.requesterId, title: 'Booking confirmed', message: `${tr.destination} — ref ${bookingRef}`, module: 'Travel', targetId: id });
      showToast('Booking confirmed');
      return { ...tr, status: 'booked', booking: { confirmed: true, bookingRef, bookedDate: today(), actualCost } };
    }));
  }, [log, notify, showToast]);

  const submitExpense = useCallback((travelId, expense) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const ex = { id: nextId('EX'), submittedDate: today(), status: 'pending', ...expense };
      log('Submitted expense', 'Travel', travelId, `${expense.category} — R${expense.amount.toLocaleString()}`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'Expense awaiting reimbursement review', message: `${tr.requesterName} — ${expense.category} R${expense.amount.toLocaleString()}`, module: 'Travel', targetId: travelId });
      showToast('Expense submitted with receipt');
      return { ...tr, expenses: [...tr.expenses, ex], status: tr.status === 'booked' ? 'expense_review' : tr.status };
    }));
  }, [log, notify, showToast]);

  const processReimbursement = useCallback((travelId, approve, comment) => {
    setTravelRequests((prev) => prev.map((tr) => {
      if (tr.id !== travelId) return tr;
      const total = tr.expenses.reduce((s, e) => s + e.amount, 0);
      const expenses = tr.expenses.map((e) => ({ ...e, status: approve ? 'approved' : 'rejected' }));
      if (approve) {
        log('Processed reimbursement', 'Travel', travelId, `Paid R${total.toLocaleString()} to ${tr.requesterName}`);
        notify({ userId: tr.requesterId, title: 'Reimbursement paid', message: `R${total.toLocaleString()} for ${tr.destination}`, module: 'Travel', targetId: travelId });
        showToast('Reimbursement processed');
        return { ...tr, expenses, status: 'completed', reimbursement: { status: 'paid', amount: total, processedDate: today(), processedBy: currentUser.name } };
      }
      log('Rejected reimbursement', 'Travel', travelId, comment || 'Receipts insufficient');
      notify({ userId: tr.requesterId, title: 'Reimbursement rejected', message: comment || 'Please resubmit receipts', module: 'Travel', targetId: travelId });
      showToast('Reimbursement rejected', 'warn');
      return { ...tr, expenses, reimbursement: { status: 'rejected', amount: total, processedDate: today(), processedBy: currentUser.name } };
    }));
  }, [currentUser, log, notify, showToast]);

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
    setBudgets((prev) => prev.map((b) => (b.id === data.budgetId ? { ...b, committed: b.committed + data.amount } : b)));
    setInvoices((prev) => [inv, ...prev]);
    log('Submitted invoice', 'Finance', inv.id, `${data.vendor} — R${data.amount.toLocaleString()}`);
    notify({ role: ROLES.FINANCE_MANAGER, title: 'Invoice awaiting Level 1 approval', message: `${data.vendor} — R${data.amount.toLocaleString()}`, module: 'Finance', targetId: inv.id });
    showToast('Invoice submitted');
  }, [currentUser, log, notify, showToast]);

  const approveInvoiceLevel1 = useCallback((id, approve, comment) => {
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv;
      const level1 = { ...inv.level1, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: Math.max(0, b.committed - inv.amount) } : b)));
        log('Rejected invoice (Level 1)', 'Finance', id, comment || 'No comment provided');
        showToast('Invoice rejected', 'warn');
        return { ...inv, level1, status: 'rejected' };
      }
      log('Approved invoice (Level 1)', 'Finance', id, comment || inv.vendor);
      notify({ role: ROLES.ADMIN, title: 'Invoice awaiting Level 2 approval', message: `${inv.vendor} — R${inv.amount.toLocaleString()}`, module: 'Finance', targetId: id });
      showToast('Approved — forwarded for Level 2 approval');
      return { ...inv, level1, status: 'pending_level2' };
    }));
  }, [log, notify, showToast]);

  const approveInvoiceLevel2 = useCallback((id, approve, comment) => {
    setInvoices((prev) => prev.map((inv) => {
      if (inv.id !== id) return inv;
      const level2 = { ...inv.level2, status: approve ? 'approved' : 'rejected', date: today(), comment };
      if (!approve) {
        setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: Math.max(0, b.committed - inv.amount) } : b)));
        log('Rejected invoice (Level 2)', 'Finance', id, comment || 'No comment provided');
        showToast('Invoice rejected', 'warn');
        return { ...inv, level2, status: 'rejected' };
      }
      setBudgets((prevB) => prevB.map((b) => (b.id === inv.budgetId ? { ...b, committed: Math.max(0, b.committed - inv.amount), spent: b.spent + inv.amount } : b)));
      log('Approved invoice (Level 2) — payment released', 'Finance', id, `${inv.vendor} — R${inv.amount.toLocaleString()}`);
      showToast('Invoice approved — payment released');
      return { ...inv, level2, status: 'paid' };
    }));
  }, [log, showToast]);

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
  }, [currentUser, log, notify, showToast]);

  const addDocumentVersion = useCallback((id, versionData) => {
    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== id) return doc;
      const version = doc.currentVersion + 1;
      const v = { version, date: today(), uploadedBy: currentUser.name, ...versionData };
      log('Uploaded new version', 'Documents', id, `${doc.title} (v${version})`);
      notify({ role: ROLES.FINANCE_MANAGER, title: 'New document version awaiting review', message: `${doc.title} (v${version})`, module: 'Documents', targetId: id });
      showToast(`New version (v${version}) uploaded`);
      return { ...doc, currentVersion: version, status: 'pending_review', versions: [...doc.versions, v] };
    }));
  }, [currentUser, log, notify, showToast]);

  const reviewDocument = useCallback((id, approve, comment) => {
    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== id) return doc;
      if (!approve) {
        log('Rejected document', 'Documents', id, comment || 'Returned for revision');
        showToast('Document returned for revision', 'warn');
        return { ...doc, status: 'rejected', reviewNote: comment };
      }
      log('Approved document', 'Documents', id, `${doc.title} (v${doc.currentVersion})`);
      showToast('Document approved');
      return { ...doc, status: 'approved', complianceChecked: true, reviewNote: '' };
    }));
  }, [log, showToast]);

  const archiveDocument = useCallback((id) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status: 'archived' } : doc)));
    log('Archived document', 'Documents', id, 'Moved to archive / retention hold');
    showToast('Document archived');
  }, [log, showToast]);

  // ---------- Admin: Users ----------
  const addUser = useCallback((data) => {
    const u = { id: nextId('u'), initials: data.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(), active: true, ...data };
    setUsers((prev) => [...prev, u]);
    log('Created user account', 'Admin', u.id, `${u.name} — ${u.role}`);
    showToast('User created');
  }, [log, showToast]);

  const updateUserRole = useCallback((id, newRole) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    log('Changed user role', 'Admin', id, `New role: ${newRole}`);
    showToast('User role updated');
  }, [log, showToast]);

  const toggleUserActive = useCallback((id) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
    const u = users.find((x) => x.id === id);
    log(u?.active ? 'Deactivated user' : 'Activated user', 'Admin', id, u?.name || id);
    showToast(u?.active ? 'User deactivated' : 'User activated');
  }, [users, log, showToast]);

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
    currentUser, role, users, switchRole,
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
