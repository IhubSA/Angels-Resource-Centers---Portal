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
    phone: row.phone || '',
    role: row.role,
    department: row.department,
    title: row.title,
    active: row.active,
    initials: row.initials,
  };
}

export function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code || '',
    department: row.department || '',
    active: row.active,
    createdDate: row.created_date,
    // Running counter behind the per-project Travel Request Number (e.g. CODE-001,
    // CODE-002, ...) — incremented atomically in the DB via the npo_portal_next_request_seq()
    // function each time a request is submitted against this project (added 2026-09-10).
    requestSeq: row.request_seq || 0,
    // Which client/programme "Main Project" this Project (now effectively a Cost Code) sits
    // under, e.g. several "Anthem - <Site> - Internship" Projects all share one Main Project,
    // "Anthem" — added 2026-09-10 per Brent's request. Blank for Projects not yet grouped.
    mainProjectId: row.main_project_id || '',
  };
}

// A "Main Project" is the client/programme umbrella (e.g. "Anthem", "ENGIE", "SCATEC") that
// several individual Projects/Cost Codes sit under — added 2026-09-10 so Budgets can be named
// and organized at the client level while still tracking spend against specific Cost Codes.
export function mapMainProject(row) {
  return { id: row.id, name: row.name, createdDate: row.created_date };
}

export function mapBudget(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    // A "Budget" is created once (Budget Name, Project, Department, Owner) with one or more
    // freely-named Line Items (Travel, Training, Meetings, ...) — each line item is still one
    // row here so all the existing allocated/committed/spent bookkeeping keeps working
    // unchanged; groupId/groupName tie a budget's line items together for display (added 2026-09-10).
    groupId: row.group_id || row.id,
    groupName: row.group_name || row.name,
    // Legacy single-Project link, kept for budgets created before 2026-09-10's Main
    // Project/Cost Code rework — new budgets use mainProjectId + costCodeIds instead.
    projectId: row.project_id || '',
    // Main Project (client/programme, e.g. "Anthem") and the specific Cost Code(s) (individual
    // Projects, e.g. "Anthem - Amstilite - Internship") this budget draws against — a budget can
    // span more than one Cost Code, e.g. a programme spanning two funding-year codes (2026-09-10).
    mainProjectId: row.main_project_id || '',
    costCodeIds: Array.isArray(row.cost_code_ids) ? row.cost_code_ids : [],
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
    client: row.client || '',
    town: row.town || '',
    programme: row.programme || '',
    activity: row.activity || '',
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
    // Per-project sequential reference (e.g. ANT_INT_AMS_PAR_TVT-001) — assigned once at
    // submission via the DB's atomic per-project counter; blank for requests submitted
    // before this existed, or with no Project selected (added 2026-09-10).
    requestNumber: row.request_number || '',
    // Rebuilt 2026-09-10 intake fields: multiple travelers (booking on behalf of colleagues),
    // a Project allocation (separate from the Budget Line used for financial tracking), and a
    // multi-leg itinerary — see src/components/travel/TravelRequestForm.jsx.
    travelers: row.travelers || [],
    noOfTravelers: row.no_of_travelers || (row.travelers || []).length || 1,
    projectId: row.project_id || '',
    businessActivity: row.business_activity || '',
    travelJustification: row.travel_justification || '',
    sntAdvanceRequired: !!row.sant_advance_required,
    multiItinerary: !!row.multi_itinerary,
    itinerary: row.itinerary || [],
    // Six-stage approval chain (ATMS-FRM-001): HOD -> Travel Office (quality) -> Bookkeeper (booking)
    // -> Finance Manager (budget/policy) -> CEO -> Board Treasurer (conditional, high-value only).
    hod: row.hod || { approverId: null, approverName: '', status: 'pending', date: null, comment: '' },
    travelOffice: row.travel_office || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    booking: row.booking || { confirmed: false, bookedBy: null, bookedByName: '', bookingRef: null, bookedDate: null, actualCost: null },
    financeReview: row.finance_review || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    ceo: row.ceo || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    boardTreasurer: row.board_treasurer || { required: false, approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    // Post-travel: Travel Office receipt check -> Finance Manager records expense & pays.
    receiptCheck: row.receipt_check || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    reimbursement: row.reimbursement || { status: 'not_applicable', amount: 0, processedDate: null, processedBy: null },
    expenses: expenseRows.filter((e) => e.travel_request_id === row.id).map(mapExpense),
  };
}

// Finance Hub requests (FIN-01/02/03): a shared five-stage flow — Line Manager ->
// Bookkeeper -> Accountant -> CEO -> payment — used by all eight request types. APR
// (Asset Purchase Request) additionally routes through an Entrepreneur Development
// Advisor and a Mentor before Line Manager review (see src/data/permissions.js header).
export function mapFinanceRequest(row) {
  return {
    id: row.id,
    requestType: row.request_type,
    vendor: row.vendor,
    description: row.description,
    category: row.category,
    amount: num(row.amount),
    budgetId: row.budget_id,
    linkedTravelRequestId: row.linked_travel_request_id,
    procurementRef: row.procurement_ref || '',
    beneficiaryDevelopmentPlan: row.beneficiary_development_plan || '',
    submittedBy: row.submitted_by,
    submittedById: row.submitted_by_id,
    submittedDate: row.submitted_date,
    status: row.status,
    eda: row.eda || { approverId: null, approverName: '', status: 'not_applicable', date: null, comment: '' },
    mentor: row.mentor || { approverId: null, approverName: '', status: 'not_applicable', date: null, comment: '' },
    lineManager: row.line_manager || { approverId: null, approverName: '', status: 'pending', date: null, comment: '' },
    bookkeeperVerification: row.bookkeeper_verification || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    accountantReview: row.accountant_review || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    ceo: row.ceo || { approverId: null, approverName: '', status: 'not_started', date: null, comment: '' },
    payment: row.payment || { status: 'not_started', reference: null, processedBy: null, processedDate: null },
    returnCount: row.return_count || 0,
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

export function mapRolePermission(row) {
  return { role: row.role, permissions: row.permissions || {} };
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
