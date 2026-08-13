# Little Angels — NPO Management System (Prototype)

A React single-page application prototype for managing an NPO's Travel, Finance, and Document Control workflows, with full role-based access control (RBAC) across five roles.

This is a **front-end prototype**: all data is mock/in-memory (defined in `src/data/`) and state lives in React context (`src/context/AppContext.jsx`). Nothing is persisted to a server or database — refreshing the page resets the demo data.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

To build a production bundle:

```bash
npm run build
npm run preview
```

The build is configured with `vite-plugin-singlefile`, so `dist/index.html` is a single, fully self-contained HTML file (JS + CSS inlined) — you can open it directly in a browser or host it anywhere as one file.

## Demo — switching roles

Use the role switcher in the top-right corner of the header to demo the app as any of the five roles:

- **Admin** (Thandiwe Mokoena) — full access, user management
- **Finance Manager** (Sarah Naidoo) — approves travel & documents, owns finance operations
- **Program Manager** (David Okafor) — submits requests, Level 1 approver for their team
- **Staff** (Lindiwe Zulu) — requests travel, submits expenses/documents (limited access)
- **Auditor** (Michael Chen) — read-only access across all modules

Switching roles re-renders the entire app against a live RBAC permission matrix (`src/data/permissions.js`) — sidebar items, buttons, tabs, and available actions all change accordingly.

## Project structure

```
src/
  data/            mock data & the RBAC permission matrix
  context/         AppContext.jsx — all app state & actions (single source of truth)
  components/
    layout/        Sidebar, Header (role switcher + notifications)
    dashboard/      Role-customized dashboard
    travel/         Travel Management module
    finance/        Finance Management module
    documents/      Document Control module
    audit/          Audit Log viewer
    admin/          User Management
    common/         Shared UI (Modal, StatusBadge, Toast, EmptyState)
  utils/format.js   Currency / date formatting helpers
```

## Try these flows

1. **Two-tier travel approval with budget gate**: as Staff, submit a new travel request. Switch to Program Manager to give Level 1 approval (this triggers an automatic budget verification). Switch to Finance Manager to give Level 2 approval, then confirm the booking.
2. **Budget hold**: `TR-1003` (Cape Town conference) is pre-seeded on budget hold — as Finance Manager, open it in Travel Management and reassign it to a budget line with sufficient funds to release the hold.
3. **Expense & reimbursement**: on a booked request, submit an expense with a mock receipt as the requester, then switch to Finance Manager/Admin to approve & pay the reimbursement.
4. **Invoice two-tier payment approval**: submit an invoice as Admin/Finance Manager, approve Level 1 as Finance Manager, then approve Level 2 (payment release) as Admin.
5. **Document version control**: open any document, upload a new version, then approve it as Finance Manager/Admin — note the compliance checklist and version history.
6. **Reports**: Finance Management → Reports & Export has working CSV exports (Budget vs Actual, Expenses, Invoices, Reimbursements), and the Audit Log page also exports CSV.
