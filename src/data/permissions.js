// Role & permission model for Angels Resource Centre NPO Management System
//
// Travel roles/stages are aligned to the "Angels Business Travel — Approval &
// Reimbursement Workflow" (source: ATMS-FRM-001, drafted 24 Aug 2026): a six-stage
// internal approval chain — Operational/HOD -> Travel Office -> Bookkeeper/Finance
// -> Finance Manager -> CEO -> Board Treasurer (conditional, high-value trips only)
// — followed by a two-step post-travel expense/reimbursement review
// (Travel Office receipt check -> Finance Manager payment).
//
// Finance Hub roles/stages are aligned to the "Angels Finance Hub — Request & Payment
// Workflow" (source: FIN-01, FIN-02, FIN-03, drafted 24 Aug 2026): a shared four-stage
// approval chain — Line Manager -> Bookkeeper -> Accountant -> CEO -> payment — used by
// every Finance Hub request type (Payment, APR, OPR, IPR, BPR, DPR, DST, OST). Line
// Manager and Accountant are distinct roles from Travel's Operational/HOD and Finance
// Manager, per direction. Asset Purchase Requests (APR) additionally route through an
// Entrepreneur Development Advisor and a Mentor before Line Manager review — this
// extension is NOT in the source diagram (which the source document itself flags as an
// open question) and was added at Brent's direction pending confirmation of FIN-02.

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  OPERATIONAL_HOD: 'operational_hod',
  TRAVEL_OFFICE: 'travel_office',
  BOOKKEEPER_FINANCE: 'bookkeeper_finance',
  FINANCE_MANAGER: 'finance_manager',
  CEO: 'ceo',
  BOARD_TREASURER: 'board_treasurer',
  AUDITOR: 'auditor',
  LINE_MANAGER: 'line_manager',
  ACCOUNTANT: 'accountant',
  ENTREPRENEUR_DEV_ADVISOR: 'entrepreneur_dev_advisor',
  MENTOR: 'mentor',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.STAFF]: 'Staff (Traveller/Requester)',
  [ROLES.OPERATIONAL_HOD]: 'Operational / HOD',
  [ROLES.TRAVEL_OFFICE]: 'Travel Office',
  [ROLES.BOOKKEEPER_FINANCE]: 'Bookkeeper / Finance',
  [ROLES.FINANCE_MANAGER]: 'Finance Manager',
  [ROLES.CEO]: 'CEO',
  [ROLES.BOARD_TREASURER]: 'Board Treasurer',
  [ROLES.AUDITOR]: 'Auditor',
  [ROLES.LINE_MANAGER]: 'Line Manager',
  [ROLES.ACCOUNTANT]: 'Accountant',
  [ROLES.ENTREPRENEUR_DEV_ADVISOR]: 'Entrepreneur Development Advisor',
  [ROLES.MENTOR]: 'Mentor',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Full system access, including user management',
  [ROLES.STAFF]: 'Identifies trip/purchase needs, submits requests & claims, uploads documents',
  [ROLES.OPERATIONAL_HOD]: 'Reviews business justification, dates & policy alignment for Travel (Stage 1)',
  [ROLES.TRAVEL_OFFICE]: 'Quality review of links, availability & policy compliance; post-travel receipt checks (Travel Stages 2 & 6)',
  [ROLES.BOOKKEEPER_FINANCE]: 'Books flights & accommodation for Travel (Stage 3); verifies documentation and processes payment for Finance Hub requests',
  [ROLES.FINANCE_MANAGER]: 'Reviews financial commitment against Travel budget & policy; records Travel expenses and issues payment; manages Finance Hub budget lines',
  [ROLES.CEO]: 'Approves Travel requests above the Board Treasurer threshold; gives final approval on Finance Hub requests',
  [ROLES.BOARD_TREASURER]: 'Counter-signs high-value Travel approvals above threshold (conditional)',
  [ROLES.AUDITOR]: 'Read-only access across all modules',
  [ROLES.LINE_MANAGER]: 'Reviews budget availability and business justification for Finance Hub requests (Stage 1)',
  [ROLES.ACCOUNTANT]: 'Reviews financial accuracy, budget availability and GL coding for Finance Hub requests (Stage 3)',
  [ROLES.ENTREPRENEUR_DEV_ADVISOR]: 'Reviews Asset Purchase Requests (APR) for alignment with the beneficiary’s development plan (APR-only, pre-Stage 1)',
  [ROLES.MENTOR]: 'Endorses Asset Purchase Requests (APR) from a mentorship perspective (APR-only, pre-Stage 1)',
};

// Trips with an actual (or estimated, pre-booking) cost above this ZAR amount require
// Board Treasurer counter-signature after CEO approval. ATMS-FRM-001 does not specify
// this figure — treat as a working placeholder pending confirmation (see ATMS-DEV-001).
export const BOARD_TREASURER_THRESHOLD = 50000;

// Procurement quotation thresholds for Finance Hub requests, per FIN-03.
export const PROCUREMENT_THRESHOLDS = [
  { max: 5000, label: 'Under R5,000', requirement: '1 quotation required' },
  { max: 30000, label: 'R5,000 – R30,000', requirement: '3 quotations required' },
  { max: Infinity, label: 'Above R30,000', requirement: 'A formal tender is required' },
];
export function procurementRequirementFor(amount) {
  const n = Number(amount) || 0;
  return (PROCUREMENT_THRESHOLDS.find((t) => n <= t.max) || PROCUREMENT_THRESHOLDS[PROCUREMENT_THRESHOLDS.length - 1]).requirement;
}

// The eight Finance Hub request types (FIN-01/02/03 + the six request-type procedures).
// Full names for OPR/IPR/BPR/DPR/DST/OST are inferred from the source document's scope
// paragraph (it spells out the initials but not the full names) — flagged for the user
// to confirm against FIN-01/02/03 directly.
export const REQUEST_TYPES = [
  { key: 'payment', label: 'Payment Request', short: 'Payment' },
  { key: 'apr', label: 'Asset Purchase Request', short: 'APR' },
  { key: 'opr', label: 'Programme Purchase Request', short: 'OPR' },
  { key: 'ipr', label: 'Internship Purchase Request', short: 'IPR' },
  { key: 'bpr', label: 'Bursary Purchase Request', short: 'BPR' },
  { key: 'dpr', label: 'Department Purchase Request', short: 'DPR' },
  { key: 'dst', label: 'Domestic Subsistence & Travel', short: 'DST' },
  { key: 'ost', label: 'Overseas Subsistence & Travel', short: 'OST' },
];

// Default permission matrix — seeds the editable `npo_portal_role_permissions` table on
// first run, and is the fallback used if a role's row is ever missing from the database.
// The LIVE matrix actually enforced by the app is loaded from Supabase (see AppContext.jsx)
// and can be viewed/edited by an Admin from Admin -> Permissions.
// "view" scope (Travel & Finance): 'all' | 'department' | 'own'.
export const DEFAULT_PERMISSIONS = {
  [ROLES.ADMIN]: {
    travel: { view: 'all', create: true, hodReview: true, qualityReview: true, book: true, financeReview: true, ceoApprove: true, boardSign: true, receiptCheck: true, pay: true },
    finance: { view: 'all', create: true, edaReview: true, mentorApprove: true, lineManagerReview: true, bookkeeperVerify: true, accountantReview: true, ceoApprove: true, processPayment: true, manageBudgets: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: true, managePermissions: true },
    audit: { view: true },
  },
  [ROLES.STAFF]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'own', create: true, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.OPERATIONAL_HOD]: {
    travel: { view: 'department', create: true, hodReview: true, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'department', create: true, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: true },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.TRAVEL_OFFICE]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: true, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: true, pay: false },
    finance: { view: 'own', create: false, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: false },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.BOOKKEEPER_FINANCE]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: true, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: true, accountantReview: false, ceoApprove: false, processPayment: true, manageBudgets: false, export: true },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.FINANCE_MANAGER]: {
    travel: { view: 'all', create: true, hodReview: false, qualityReview: false, book: false, financeReview: true, ceoApprove: false, boardSign: false, receiptCheck: false, pay: true },
    finance: { view: 'all', create: true, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.CEO]: {
    travel: { view: 'all', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: true, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: true, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: true, processPayment: false, manageBudgets: false, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.BOARD_TREASURER]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: true, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: true },
    documents: { view: 'all', upload: false, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.AUDITOR]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: true },
    documents: { view: 'all', upload: false, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.LINE_MANAGER]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'department', create: true, edaReview: false, mentorApprove: false, lineManagerReview: true, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.ACCOUNTANT]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: false, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: true, ceoApprove: false, processPayment: false, manageBudgets: false, export: true },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.ENTREPRENEUR_DEV_ADVISOR]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: true, mentorApprove: false, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.MENTOR]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', create: false, edaReview: false, mentorApprove: true, lineManagerReview: false, bookkeeperVerify: false, accountantReview: false, ceoApprove: false, processPayment: false, manageBudgets: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
};

// Generic lookups against any permission map (static default, or the live DB-backed one
// held in AppContext state) — used by AppContext to build the `can`/`scope` it exposes.
export function canWith(permMap, role, module, action) {
  return Boolean(permMap?.[role]?.[module]?.[action]);
}

export function viewScopeWith(permMap, role, module) {
  return permMap?.[role]?.[module]?.view || 'own';
}

// Convenience wrappers against the static defaults — used only as a fallback before the
// live matrix has loaded from Supabase, or if a role's row is missing from the database.
export function can(role, module, action) {
  return canWith(DEFAULT_PERMISSIONS, role, module, action);
}

export function viewScope(role, module) {
  return viewScopeWith(DEFAULT_PERMISSIONS, role, module);
}

// Describes the matrix for the Admin -> Permissions screen: which modules exist, which
// actions each has (with display labels), and whether the module has a "view scope"
// selector (own / department / all) in addition to its boolean actions.
export const PERMISSION_SCHEMA = [
  {
    key: 'travel', label: 'Travel Management', hasViewScope: true,
    actions: [
      { key: 'create', label: 'Submit travel request' },
      { key: 'hodReview', label: 'Stage 1 — HOD review' },
      { key: 'qualityReview', label: 'Stage 2 — Travel Office quality review' },
      { key: 'book', label: 'Stage 3 — Book & record (Bookkeeper)' },
      { key: 'financeReview', label: 'Stage 4 — Finance Manager budget/policy review' },
      { key: 'ceoApprove', label: 'Stage 5 — CEO approval' },
      { key: 'boardSign', label: 'Stage 6 — Board Treasurer counter-signature' },
      { key: 'receiptCheck', label: 'Post-travel — Travel Office receipt check' },
      { key: 'pay', label: 'Post-travel — Finance Manager record & pay' },
    ],
  },
  {
    key: 'finance', label: 'Finance Hub Requests', hasViewScope: true,
    actions: [
      { key: 'create', label: 'Submit a request' },
      { key: 'edaReview', label: 'APR only — Entrepreneur Dev. Advisor review' },
      { key: 'mentorApprove', label: 'APR only — Mentor approval' },
      { key: 'lineManagerReview', label: 'Stage 1 — Line Manager review' },
      { key: 'bookkeeperVerify', label: 'Stage 2 — Bookkeeper verification' },
      { key: 'accountantReview', label: 'Stage 3 — Accountant review' },
      { key: 'ceoApprove', label: 'Stage 4 — CEO approval' },
      { key: 'processPayment', label: 'Stage 5 — Bookkeeper: process & record payment' },
      { key: 'manageBudgets', label: 'Create/adjust budget lines' },
      { key: 'export', label: 'Export reports (CSV)' },
    ],
  },
  {
    key: 'documents', label: 'Document Control', hasViewScope: true,
    actions: [
      { key: 'upload', label: 'Upload document / new version' },
      { key: 'review', label: 'Review document' },
      { key: 'approve', label: 'Approve document' },
      { key: 'archive', label: 'Archive document' },
      { key: 'manageRetention', label: 'Manage retention settings' },
    ],
  },
  {
    key: 'admin', label: 'Admin', hasViewScope: false,
    actions: [
      { key: 'manageUsers', label: 'Manage users & roles' },
      { key: 'managePermissions', label: 'Manage this permissions matrix' },
    ],
  },
  {
    key: 'audit', label: 'Audit Log', hasViewScope: false,
    actions: [
      { key: 'view', label: 'View audit log' },
    ],
  },
];
