# Little Angels — NPO Management System (Prototype)

A React single-page application prototype for managing an NPO's Travel, Finance, and Document Control workflows, with full role-based access control (RBAC) across five roles.

Data is persisted in a real Supabase (Postgres) database — every action (submitting a request, approving, uploading a document, etc.) is written through, and reloading the page fetches the current state from the database. Role access is still controlled client-side via a demo role switcher (see below) rather than real per-person login; the database itself has Row Level Security enabled but with fully open policies, since there's no auth layer yet to check against.

## Getting started

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in your Supabase project's URL and anon key (Project Settings → API in the Supabase dashboard). Then:

```bash
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Database

The schema lives in the `npo_portal_*` tables (`npo_portal_users`, `npo_portal_budgets`, `npo_portal_travel_requests`, `npo_portal_travel_expenses`, `npo_portal_invoices`, `npo_portal_documents`, `npo_portal_document_versions`, `npo_portal_audit_log`) — namespaced this way because the Supabase project is shared with a few other apps. All nested sub-objects from the original prototype (`level1`/`level2` approval state, `budgetCheck`, `booking`, `reimbursement`) are stored as `jsonb` columns rather than flattened into separate tables, which keeps the mapping between the database and the UI's existing data shapes simple — see `src/lib/mappers.js`.

`src/lib/supabaseClient.js` creates the Supabase client from the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` environment variables. `src/context/AppContext.jsx` loads all tables on startup and writes through to Supabase on every action, while still updating local React state immediately for a responsive UI.

**Deploying:** if you're hosting this on Vercel (or anywhere else that builds from source), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in that platform's environment variables settings — Vite bakes them in at build time, so they need to be set *before* the production build runs, not just available at runtime.

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
  data/permissions.js   the RBAC permission matrix (roles, what each can do)
  lib/
    supabaseClient.js    Supabase client + table name constants
    mappers.js            maps DB rows (snake_case) <-> UI shapes (camelCase)
  context/         AppContext.jsx — all app state, Supabase reads/writes & actions (single source of truth)
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

Since data is now shared through a real database rather than reset-on-refresh mock state, anything you do here is visible to everyone else using this deployment (and stays there until someone changes it again) — worth keeping in mind if several people are poking at the demo at once.

1. **Two-tier travel approval with budget gate**: as Staff, submit a new travel request. Switch to Program Manager to give Level 1 approval (this triggers an automatic budget verification). Switch to Finance Manager to give Level 2 approval, then confirm the booking.
2. **Budget hold**: `TR-1003` (Cape Town conference) is pre-seeded on budget hold — as Finance Manager, open it in Travel Management and reassign it to a budget line with sufficient funds to release the hold.
3. **Expense & reimbursement**: on a booked request, submit an expense with a mock receipt as the requester, then switch to Finance Manager/Admin to approve & pay the reimbursement.
4. **Invoice two-tier payment approval**: submit an invoice as Admin/Finance Manager, approve Level 1 as Finance Manager, then approve Level 2 (payment release) as Admin.
5. **Document version control**: open any document, upload a new version, then approve it as Finance Manager/Admin — note the compliance checklist and version history.
6. **Reports**: Finance Management → Reports & Export has working CSV exports (Budget vs Actual, Expenses, Invoices, Reimbursements), and the Audit Log page also exports CSV.
