// Maps Supabase rows (snake_case, flat) to the camelCase shapes the UI components
// already expect (unchanged from the original mock-data prototype), and back again
// for writes. Keeping this mapping isolated here means no component files needed to
// change when the app moved from in-memory mock data to a real Supabase database.

const num = (v) => (v === null || v === undefined ? 0 : Number(v));

export function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    title: row.title,
    active: row.active,
    initials: row.initials,
  };
}

export function mapBudget(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    fiscalYear: row.fiscal_year,
    department: row.department,
    owner: row.owner,
    allocated: num(row.allocated),
    committed: num(row.committed),
    spent: num(row.spent),
  };
}

export function mapExpense(row) {
  return {
    id: row.id,
    category: row.category,
    amount: num(row.amount),
    description: row.description,
    receiptName: row.receipt_name,
    submittedDate: row.submitted_date,
    status: row.status,
  };
}

export function mapTravelRequest(row, expenseRows = []) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    department: row.department,
    destination: row.destination,
    purpose: row.purpose,
    startDate: row.start_date,
    endDate: row.end_date,
    estimatedCost: num(row.estimated_cost),
    budgetId: row.budget_id,
    status: row.status,
    createdDate: row.created_date,
    level1: row.level1 || {},
    level2: row.level2 || {},
    budgetCheck: row.budget_check || null,
    booking: row.booking || { confirmed: false, bookingRef: null, bookedDate: null, actualCost: null },
    reimbursement: row.reimbursement || { status: 'not_applicable', amount: 0, processedDate: null, processedBy: null },
    expenses: expenseRows.filter((e) => e.travel_request_id === row.id).map(mapExpense),
  };
}

export function mapInvoice(row) {
  return {
    id: row.id,
    vendor: row.vendor,
    description: row.description,
    category: row.category,
    amount: num(row.amount),
    budgetId: row.budget_id,
    linkedTravelRequestId: row.linked_travel_request_id,
    submittedBy: row.submitted_by,
    submittedDate: row.submitted_date,
    status: row.status,
    level1: row.level1 || {},
    level2: row.level2 || {},
  };
}

export function mapDocVersion(row) {
  return {
    version: row.version,
    date: row.date,
    uploadedBy: row.uploaded_by,
    fileName: row.file_name,
    changeSummary: row.change_summary,
  };
}

export function mapDocument(row, versionRows = []) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    owner: row.owner,
    uploadedBy: row.uploaded_by,
    uploadDate: row.upload_date,
    status: row.status,
    currentVersion: row.current_version,
    complianceChecked: row.compliance_checked,
    retentionDate: row.retention_date,
    viewRoles: row.view_roles || [],
    editRoles: row.edit_roles || [],
    reviewNote: row.review_note || '',
    tags: row.tags || [],
    versions: versionRows
      .filter((v) => v.document_id === row.id)
      .sort((a, b) => a.version - b.version)
      .map(mapDocVersion),
  };
}

export function formatTimestamp(ts) {
  const d = ts ? new Date(ts) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function mapAuditLog(row) {
  return {
    id: row.id,
    timestamp: formatTimestamp(row.ts),
    userName: row.user_name,
    role: row.role,
    action: row.action,
    module: row.module,
    targetId: row.target_id,
    details: row.details,
  };
}
