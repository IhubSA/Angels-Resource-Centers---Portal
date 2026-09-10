import { useState } from 'react';
import { Heart, Plane, Wallet, AlertCircle, ChevronLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Toast from '../common/Toast';
import TravelRequestForm from '../travel/TravelRequestForm';
import FinanceRequestForm from '../finance/FinanceRequestForm';

// Standalone public entry point (2026-09-10) — a link staff can be given directly (e.g.
// https://<the-deployed-site>/#/request) so they can submit a Travel Request or a Finance
// Hub Request without navigating the full system, logging in, or knowing anything about the
// dashboard. It intentionally reuses the exact same AppContext, TravelRequestForm and
// FinanceRequestForm as the main app — same validation, same approval routing, same budget
// math, same per-project request numbers — so nothing here can drift out of sync with the
// internal forms. See src/main.jsx for the hash-based routing that reaches this page, and
// deployment-notes.md ("Public request link") for the full write-up, including the one real
// limitation: there is still no login behind this link, so "who submitted it" is only as
// trustworthy as the honesty of whoever picks a name from the dropdown below.
export default function PublicRequestPage() {
  const { loading, loadError, users, currentUser, identifyAs, can } = useApp();
  const [pickedUserId, setPickedUserId] = useState('');
  const [identified, setIdentified] = useState(false);
  const [openForm, setOpenForm] = useState(null); // null | 'travel' | 'finance'

  if (loading) return <CenteredScreen><Heart size={22} className="pulse" /><p>Loading…</p></CenteredScreen>;
  if (loadError) {
    return (
      <CenteredScreen>
        <AlertCircle size={32} color="var(--red)" />
        <h3 style={{ margin: 0 }}>Couldn't load this page</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 420, fontSize: 13.5, textAlign: 'center' }}>{loadError}</p>
      </CenteredScreen>
    );
  }

  const activeUsers = users.filter((u) => u.active);

  function handleContinue(e) {
    e.preventDefault();
    if (!pickedUserId) return;
    identifyAs(pickedUserId);
    setIdentified(true);
  }

  const canTravel = identified && can('travel', 'create');
  const canFinance = identified && can('finance', 'create');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div className="sidebar-brand-mark"><Heart size={17} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Angels Resource Centre</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Submit a Request</div>
        </div>
      </div>

      {!identified && (
        <div className="card card-pad" style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Who's submitting this?</h2>
          <p className="hint" style={{ marginBottom: 14 }}>Pick your name to continue — this identifies you as the requester and fills in your department automatically.</p>
          <form onSubmit={handleContinue}>
            <div className="field">
              <label>Your Name *</label>
              <select className="input" value={pickedUserId} onChange={(e) => setPickedUserId(e.target.value)}>
                <option value="">Select your name…</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.department}{u.title ? ` (${u.title})` : ''}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={!pickedUserId} style={{ marginTop: 8 }}>Continue</button>
          </form>
          {activeUsers.length === 0 && <p className="hint" style={{ marginTop: 10 }}>No active users are set up yet — ask your administrator to add you in User Management first.</p>}
        </div>
      )}

      {identified && (
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Submitting as</div>
              <div style={{ fontWeight: 650 }}>{currentUser.name} <span className="cell-muted" style={{ fontWeight: 500 }}>— {currentUser.department}</span></div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setIdentified(false); setPickedUserId(''); }}><ChevronLeft size={13} /> Not you?</button>
          </div>

          <div className="grid grid-2" style={{ gap: 12 }}>
            {canTravel && (
              <button className="card card-pad" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={() => setOpenForm('travel')}>
                <span className="stat-tile-icon" style={{ background: 'var(--brand-light)', color: 'var(--brand)', alignSelf: 'flex-start' }}><Plane size={16} /></span>
                <strong style={{ fontSize: 14 }}>New Travel Request</strong>
                <span className="hint" style={{ margin: 0 }}>Air, road, or accommodation — single trip or a multi-leg itinerary.</span>
              </button>
            )}
            {canFinance && (
              <button className="card card-pad" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={() => setOpenForm('finance')}>
                <span className="stat-tile-icon" style={{ background: 'var(--brand-light)', color: 'var(--brand)', alignSelf: 'flex-start' }}><Wallet size={16} /></span>
                <strong style={{ fontSize: 14 }}>New Finance Hub Request</strong>
                <span className="hint" style={{ margin: 0 }}>Payment, Asset Purchase, and other Finance Hub request types.</span>
              </button>
            )}
          </div>

          {!canTravel && !canFinance && (
            <div className="card card-pad">
              <p className="hint" style={{ margin: 0 }}>{currentUser.name}'s role doesn't currently have permission to submit either type of request. If this seems wrong, check with your administrator.</p>
            </div>
          )}

          <p className="hint" style={{ textAlign: 'center', marginTop: 18 }}>You can submit more than one request from this page — after submitting, you'll land back here.</p>
        </div>
      )}

      {openForm === 'travel' && <TravelRequestForm open onClose={() => setOpenForm(null)} />}
      {openForm === 'finance' && <FinanceRequestForm open onClose={() => setOpenForm(null)} />}
      <Toast />
    </div>
  );
}

function CenteredScreen({ children }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--bg)', padding: 24, textAlign: 'center' }}>
      {children}
      <style>{`.pulse { animation: pulse 1.4s ease-in-out infinite; } @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
