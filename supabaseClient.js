import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced clearly in the UI (see App.jsx) rather than a silent blank screen.
  console.error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    '(in a local .env file for development, and in your Vercel project\'s Environment Variables for production).'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// All tables for this app live in the shared "IhubSA's Project" Supabase project,
// namespaced with this prefix so they can't collide with other apps' tables.
export const TABLES = {
  users: 'npo_portal_users',
  budgets: 'npo_portal_budgets',
  travelRequests: 'npo_portal_travel_requests',
  travelExpenses: 'npo_portal_travel_expenses',
  invoices: 'npo_portal_invoices',
  documents: 'npo_portal_documents',
  documentVersions: 'npo_portal_document_versions',
  auditLog: 'npo_portal_audit_log',
  rolePermissions: 'npo_portal_role_permissions',
};
