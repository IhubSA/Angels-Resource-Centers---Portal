const STATUS_MAP = {
  // generic
  pending: { label: 'Pending', tone: 'amber' },
  pending_level1: { label: 'Pending L1 Approval', tone: 'amber' },
  pending_level2: { label: 'Pending L2 Approval', tone: 'blue' },
  budget_hold: { label: 'Budget Hold', tone: 'red' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  booked: { label: 'Booked', tone: 'blue' },
  expense_review: { label: 'Expenses Under Review', tone: 'amber' },
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
