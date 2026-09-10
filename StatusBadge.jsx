const STATUS_MAP = {
  // generic
  pending: { label: 'Pending', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  completed: { label: 'Completed', tone: 'green' },
  paid: { label: 'Paid', tone: 'green' },
  draft: { label: 'Draft', tone: 'slate' },
  pending_review: { label: 'Pending Review', tone: 'amber' },
  archived: { label: 'Archived', tone: 'slate' },
  in_progress: { label: 'In Progress', tone: 'blue' },
  not_started: { label: 'Not Started', tone: 'slate' },
  not_applicable: { label: 'N/A', tone: 'slate' },
  active: { label: 'Active', tone: 'green' },
  inactive: { label: 'Inactive', tone: 'slate' },
  // finance hub requests — shared chain (FIN-01/02/03)
  pending_eda: { label: 'Pending EDA Review', tone: 'amber' },
  pending_mentor: { label: 'Pending Mentor Approval', tone: 'amber' },
  pending_line_manager: { label: 'Pending Line Manager Review', tone: 'amber' },
  pending_bookkeeper_verification: { label: 'Pending Bookkeeper Verification', tone: 'amber' },
  pending_accountant_review: { label: 'Pending Accountant Review', tone: 'amber' },
  returned_by_eda: { label: 'Returned by EDA', tone: 'red' },
  returned_by_mentor: { label: 'Returned by Mentor', tone: 'red' },
  returned_by_line_manager: { label: 'Returned by Line Manager', tone: 'red' },
  returned_by_bookkeeper: { label: 'Returned by Bookkeeper', tone: 'red' },
  returned_by_accountant: { label: 'Returned by Accountant', tone: 'red' },
  returned_by_ceo: { label: 'Declined by CEO', tone: 'red' },
  // travel — six-stage approval chain (ATMS-FRM-001)
  pending_hod: { label: 'Pending HOD Review', tone: 'amber' },
  pending_quality: { label: 'Travel Office Quality Review', tone: 'amber' },
  pending_booking: { label: 'Ready to Book', tone: 'blue' },
  finance_hold: { label: 'Finance Hold', tone: 'red' },
  pending_finance_review: { label: 'Finance Manager Review', tone: 'amber' },
  pending_ceo: { label: 'Pending CEO Approval', tone: 'amber' },
  pending_board: { label: 'Pending Board Sign-off', tone: 'amber' },
  cleared_for_travel: { label: 'Cleared for Travel', tone: 'blue' },
  expense_review: { label: 'Receipt Check (Travel Office)', tone: 'amber' },
  reimbursement_hold: { label: 'Needs Corrections', tone: 'red' },
  pending_payment: { label: 'Pending Payment', tone: 'blue' },
};

export default function StatusBadge({ status, label }) {
  const meta = STATUS_MAP[status] || { label: label || status, tone: 'slate' };
  return (
    <span className={`badge badge-${meta.tone}`}>
      <span className="badge-dot" />
      {label || meta.label}
    </span>
  );
}
