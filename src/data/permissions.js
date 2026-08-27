// Role & permission model for Angels Resource Centre NPO Management System
//
// Travel roles/stages are aligned to the "Angels Business Travel — Approval &
// Reimbursement Workflow" (source: ATMS-FRM-001, drafted 24 Aug 2026): a six-stage
// internal approval chain — Operational/HOD -> Travel Office -> Bookkeeper/Finance
// -> Finance Manager -> CEO -> Board Treasurer (conditional, high-value trips only)
// — followed by a two-step post-travel expense/reimbursement review
// (Travel Office receipt check -> Finance Manager payment).

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
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Full system access, including user management',
  [ROLES.STAFF]: 'Identifies trip needs, submits requests & expense claims, uploads documents',
  [ROLES.OPERATIONAL_HOD]: 'Reviews business justification, dates & policy alignment (Stage 1)',
  [ROLES.TRAVEL_OFFICE]: 'Quality review of links, availability & policy compliance; post-travel receipt checks (Stages 2 & 6)',
  [ROLES.BOOKKEEPER_FINANCE]: 'Books flights & accommodation, records confirmations & costs in Xero (Stage 3)',
  [ROLES.FINANCE_MANAGER]: 'Reviews financial commitment against budget & policy; records expenses and issues payment (Stages 4 & 7)',
  [ROLES.CEO]: 'Approves trips, including sign-off above Board Treasurer threshold (Stage 5)',
  [ROLES.BOARD_TREASURER]: 'Counter-signs high-value trip approvals above threshold (Stage 6, conditional)',
  [ROLES.AUDITOR]: 'Read-only access across all modules',
};

// Trips with an actual (or estimated, pre-booking) cost above this ZAR amount require
// Board Treasurer counter-signature after CEO approval. ATMS-FRM-001 does not specify
// this figure — treat as a working placeholder pending confirmation (see ATMS-DEV-001).
export const BOARD_TREASURER_THRESHOLD = 50000;

// Default permission matrix — seeds the editable `npo_portal_role_permissions` table on
// first run, and is the fallback used if a role's row is ever missing from the database.
// The LIVE matrix actually enforced by the app is loaded from Supabase (see AppContext.jsx)
// and can be viewed/edited by an Admin from Admin -> Permissions.
// Travel "view" scope: 'all' | 'department' | 'own'.
export const DEFAULT_PERMISSIONS = {
  [ROLES.ADMIN]: {
    travel: { view: 'all', create: true, hodReview: true, qualityReview: true, book: true, financeReview: true, ceoApprove: true, boardSign: true, receiptCheck: true, pay: true },
    finance: { view: 'all', manageBudgets: true, createInvoice: true, approveLevel1: true, approveLevel2: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: true, managePermissions: true },
    audit: { view: true },
  },
  [ROLES.STAFF]: {
    travel: { view: 'own', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'own', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.OPERATIONAL_HOD]: {
    travel: { view: 'department', create: true, hodReview: true, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'department', manageBudgets: false, createInvoice: true, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.TRAVEL_OFFICE]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: true, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: true, pay: false },
    finance: { view: 'own', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: false },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.BOOKKEEPER_FINANCE]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: true, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', manageBudgets: false, createInvoice: true, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: false },
  },
  [ROLES.FINANCE_MANAGER]: {
    travel: { view: 'all', create: true, hodReview: false, qualityReview: false, book: false, financeReview: true, ceoApprove: false, boardSign: false, receiptCheck: false, pay: true },
    finance: { view: 'all', manageBudgets: true, createInvoice: true, approveLevel1: true, approveLevel2: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.CEO]: {
    travel: { view: 'all', create: true, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: true, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.BOARD_TREASURER]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: true, receiptCheck: false, pay: false },
    finance: { view: 'all', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: false, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
  },
  [ROLES.AUDITOR]: {
    travel: { view: 'all', create: false, hodReview: false, qualityReview: false, book: false, financeReview: false, ceoApprove: false, boardSign: false, receiptCheck: false, pay: false },
    finance: { view: 'all', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: false, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false, managePermissions: false },
    audit: { view: true },
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
    key: 'finance', label: 'Finance Management', hasViewScope: true,
    actions: [
      { key: 'manageBudgets', label: 'Create/adjust budget lines' },
      { key: 'createInvoice', label: 'Submit invoice' },
      { key: 'approveLevel1', label: 'Invoice Level 1 approval' },
      { key: 'approveLevel2', label: 'Invoice Level 2 approval (payment release)' },
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
