// Role & permission model for Little Angels NPO Management System

export const ROLES = {
  ADMIN: 'admin',
  FINANCE_MANAGER: 'finance_manager',
  PROGRAM_MANAGER: 'program_manager',
  STAFF: 'staff',
  AUDITOR: 'auditor',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.FINANCE_MANAGER]: 'Finance Manager',
  [ROLES.PROGRAM_MANAGER]: 'Program Manager',
  [ROLES.STAFF]: 'Staff',
  [ROLES.AUDITOR]: 'Auditor',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: 'Full system access, including user management',
  [ROLES.FINANCE_MANAGER]: 'Approves travel & documents, owns all finance operations',
  [ROLES.PROGRAM_MANAGER]: 'Submits travel requests, expenses and documents; Level 1 approver',
  [ROLES.STAFF]: 'Requests travel, submits expenses, uploads documents (limited access)',
  [ROLES.AUDITOR]: 'Read-only access across all modules',
};

// Permission matrix — the single source of truth for what each role can do.
export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    travel: { view: 'all', create: true, approveLevel1: true, approveLevel2: true, book: true, reimburse: true },
    finance: { view: 'all', manageBudgets: true, createInvoice: true, approveLevel1: true, approveLevel2: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: true },
    audit: { view: true },
  },
  [ROLES.FINANCE_MANAGER]: {
    travel: { view: 'all', create: true, approveLevel1: false, approveLevel2: true, book: true, reimburse: true },
    finance: { view: 'all', manageBudgets: true, createInvoice: true, approveLevel1: true, approveLevel2: true, export: true },
    documents: { view: 'all', upload: true, review: true, approve: true, archive: true, manageRetention: true },
    admin: { manageUsers: false },
    audit: { view: true },
  },
  [ROLES.PROGRAM_MANAGER]: {
    travel: { view: 'team', create: true, approveLevel1: true, approveLevel2: false, book: false, reimburse: false },
    finance: { view: 'team', manageBudgets: false, createInvoice: true, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: true, review: true, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false },
    audit: { view: false },
  },
  [ROLES.STAFF]: {
    travel: { view: 'own', create: true, approveLevel1: false, approveLevel2: false, book: false, reimburse: false },
    finance: { view: 'own', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: false },
    documents: { view: 'own', upload: true, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false },
    audit: { view: false },
  },
  [ROLES.AUDITOR]: {
    travel: { view: 'all', create: false, approveLevel1: false, approveLevel2: false, book: false, reimburse: false },
    finance: { view: 'all', manageBudgets: false, createInvoice: false, approveLevel1: false, approveLevel2: false, export: true },
    documents: { view: 'all', upload: false, review: false, approve: false, archive: false, manageRetention: false },
    admin: { manageUsers: false },
    audit: { view: true },
  },
};

export function can(role, module, action) {
  return Boolean(PERMISSIONS?.[role]?.[module]?.[action]);
}

export function viewScope(role, module) {
  return PERMISSIONS?.[role]?.[module]?.view || 'own';
}
