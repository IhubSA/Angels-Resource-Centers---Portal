import { useMemo, useState } from 'react';
import { Trash2, Plus, MapPin } from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { money } from '../../utils/format';

const TRAVEL_TYPES = [
  { key: 'air', label: 'Travel by Air' },
  { key: 'road', label: 'Travel by Road' },
  { key: 'air_road', label: 'Travel by Air and Road' },
  { key: 'accommodation', label: 'Accommodation only' },
];

const RENTAL_CAR_OPTIONS = [
  { key: 'none', label: 'Not required' },
  { key: 'B', label: 'B Class — Small passenger vehicle' },
  { key: 'O', label: 'O Class — Larger vehicle for carrying equipment' },
];

const BLANK_LEG = {
  travelType: 'air',
  destination: '',
  departDateTime: '',
  roundTrip: false,
  returnDateTime: '',
  rentalCar: 'none',
  secondDriverRequired: false,
  secondDriverName: '',
  accommodationRequired: false,
  accommodationDetails: '',
};

function legLabel(leg, index) {
  const type = TRAVEL_TYPES.find((t) => t.key === leg.travelType)?.label || leg.travelType;
  return `${index + 1}. ${leg.destination || 'Untitled destination'} — ${type}`;
}

function LegFields({ leg, update }) {
  return (
    <>
      <div className="field-row">
        <div className="field">
          <label>Mode of Transport *</label>
          <select className="input" value={leg.travelType} onChange={(e) => update('travelType', e.target.value)}>
            {TRAVEL_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Destination *</label>
          <input className="input" value={leg.destination} onChange={(e) => update('destination', e.target.value)} placeholder="e.g. Durban, KwaZulu-Natal" />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Expected Travel Date & Time *</label>
          <input type="datetime-local" className="input" value={leg.departDateTime} onChange={(e) => update('departDateTime', e.target.value)} />
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 22 }}>
            <input type="checkbox" checked={leg.roundTrip} onChange={(e) => update('roundTrip', e.target.checked)} />
            Is this a round trip?
          </label>
          {leg.roundTrip && (
            <input type="datetime-local" className="input" style={{ marginTop: 6 }} value={leg.returnDateTime} onChange={(e) => update('returnDateTime', e.target.value)} placeholder="Return date & time" />
          )}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Rental Car Required</label>
          <select className="input" value={leg.rentalCar} onChange={(e) => update('rentalCar', e.target.value)}>
            {RENTAL_CAR_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        {leg.rentalCar !== 'none' && (
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={leg.secondDriverRequired} onChange={(e) => update('secondDriverRequired', e.target.checked)} />
              Second driver required?
            </label>
            {leg.secondDriverRequired && (
              <input className="input" style={{ marginTop: 6 }} value={leg.secondDriverName} onChange={(e) => update('secondDriverName', e.target.value)} placeholder="Second driver's name" />
            )}
          </div>
        )}
      </div>

      <div className="field">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={leg.accommodationRequired} onChange={(e) => update('accommodationRequired', e.target.checked)} />
          Accommodation required
        </label>
        {leg.accommodationRequired && (
          <textarea className="input" style={{ marginTop: 6 }} value={leg.accommodationDetails} onChange={(e) => update('accommodationDetails', e.target.value)} placeholder="Where, how many nights, any special requirements…" />
        )}
      </div>
    </>
  );
}

export default function TravelRequestForm({ open, onClose }) {
  const { submitTravelRequest, budgets, projects, users, currentUser } = useApp();
  const travelBudgets = budgets.filter((b) => b.category === 'Travel' || b.department === currentUser.department);
  const activeProjects = projects.filter((p) => p.active);
  const travelerChoices = users.filter((u) => u.active);

  const [trip, setTrip] = useState({
    travelerIds: [currentUser.id],
    businessActivity: '',
    projectId: activeProjects[0]?.id || '',
    budgetId: travelBudgets[0]?.id || budgets[0]?.id || '',
    estimatedCost: '',
    travelJustification: '',
    sntAdvanceRequired: false,
    multiItinerary: false,
  });
  const [legDraft, setLegDraft] = useState({ ...BLANK_LEG });
  const [itinerary, setItinerary] = useState([]);
  const [error, setError] = useState('');

  function updateTrip(field, value) { setTrip((t) => ({ ...t, [field]: value })); }
  function updateLeg(field, value) { setLegDraft((l) => ({ ...l, [field]: value })); }

  function toggleTraveler(id) {
    setTrip((t) => {
      const has = t.travelerIds.includes(id);
      return { ...t, travelerIds: has ? t.travelerIds.filter((x) => x !== id) : [...t.travelerIds, id] };
    });
  }

  const selectedTravelers = useMemo(
    () => travelerChoices.filter((u) => trip.travelerIds.includes(u.id)),
    [travelerChoices, trip.travelerIds]
  );

  function legIsComplete(leg) {
    if (!leg.destination || !leg.departDateTime) return false;
    if (leg.roundTrip && !leg.returnDateTime) return false;
    return true;
  }

  function tripFieldsComplete() {
    return trip.travelerIds.length > 0 && trip.businessActivity && trip.projectId && trip.budgetId
      && trip.estimatedCost !== '' && trip.travelJustification;
  }

  function addLegToItinerary() {
    if (!legIsComplete(legDraft)) {
      setError('Complete the destination, date & time (and return date, if a round trip) before adding this leg.');
      return;
    }
    setItinerary((prev) => [...prev, legDraft]);
    setLegDraft({ ...BLANK_LEG });
    setError('');
  }

  function removeLeg(index) {
    setItinerary((prev) => prev.filter((_, i) => i !== index));
  }

  function resetAll() {
    setTrip({
      travelerIds: [currentUser.id], businessActivity: '', projectId: activeProjects[0]?.id || '',
      budgetId: travelBudgets[0]?.id || budgets[0]?.id || '', estimatedCost: '', travelJustification: '',
      sntAdvanceRequired: false, multiItinerary: false,
    });
    setLegDraft({ ...BLANK_LEG });
    setItinerary([]);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!tripFieldsComplete()) {
      setError('Please complete all required fields, including at least one traveler.');
      return;
    }
    const finalItinerary = trip.multiItinerary ? itinerary : [legDraft];
    if (trip.multiItinerary && finalItinerary.length === 0) {
      setError('Add at least one itinerary leg before submitting a multi-leg trip.');
      return;
    }
    if (!trip.multiItinerary && !legIsComplete(legDraft)) {
      setError('Complete the destination, date & time (and return date, if a round trip).');
      return;
    }
    for (const leg of finalItinerary) {
      if (!legIsComplete(leg)) {
        setError('One of the itinerary legs is missing its destination or date & time.');
        return;
      }
    }

    submitTravelRequest({
      travelers: selectedTravelers.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', department: u.department })),
      noOfTravelers: selectedTravelers.length,
      businessActivity: trip.businessActivity,
      projectId: trip.projectId,
      budgetId: trip.budgetId,
      estimatedCost: Number(trip.estimatedCost),
      travelJustification: trip.travelJustification,
      sntAdvanceRequired: trip.sntAdvanceRequired,
      multiItinerary: trip.multiItinerary,
      itinerary: finalItinerary.map((leg, i) => ({ id: `LEG-${i + 1}-${Date.now().toString(36)}`, ...leg })),
    });
    resetAll();
    onClose();
  }

  const canSubmit = trip.multiItinerary ? itinerary.length > 0 : legIsComplete(legDraft);

  return (
    <Modal open={open} onClose={onClose} size="lg" title="New Travel Request" subtitle="Single trip or multi-leg itinerary — Air, Road, Air & Road, or Accommodation" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="travel-request-form" type="submit" disabled={!canSubmit}>
          {trip.multiItinerary ? `Submit Trip (${itinerary.length} leg${itinerary.length === 1 ? '' : 's'})` : 'Submit Request'}
        </button>
      </>
    }>
      <form id="travel-request-form" onSubmit={handleSubmit}>
        {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="section-title">Who's Travelling</div>
        <div className="kv-row" style={{ marginBottom: 10 }}>
          <span className="k">Requested by</span>
          <span className="v">{currentUser.name} ({currentUser.department})</span>
        </div>
        <div className="field">
          <label>Traveler(s) * — select everyone this request covers</label>
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            {travelerChoices.map((u) => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={trip.travelerIds.includes(u.id)} onChange={() => toggleTraveler(u.id)} />
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                <span className="cell-muted">{u.department}</span>
                <span className="cell-muted" style={{ marginLeft: 'auto', textAlign: 'right' }}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</span>
              </label>
            ))}
          </div>
          <p className="hint">No. of Travelers: <strong>{selectedTravelers.length}</strong> — a HOD, PA or Travel Office user can book on behalf of colleagues by selecting more than one.</p>
        </div>

        <div className="section-title">Trip Details</div>
        <div className="field"><label>Business Activity *</label><input className="input" value={trip.businessActivity} onChange={(e) => updateTrip('businessActivity', e.target.value)} placeholder="e.g. Attend inter-agency coordination meeting" /></div>
        <div className="field-row">
          <div className="field">
            <label>Project *</label>
            <select className="input" value={trip.projectId} onChange={(e) => updateTrip('projectId', e.target.value)}>
              <option value="">Select a project…</option>
              {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Budget Line *</label>
            <select className="input" value={trip.budgetId} onChange={(e) => updateTrip('budgetId', e.target.value)}>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><label>Estimated Cost (ZAR) *</label><input type="number" min="0" className="input" value={trip.estimatedCost} onChange={(e) => updateTrip('estimatedCost', e.target.value)} placeholder="0" /></div>
          <div className="field">
            <label>S&T's advance required?</label>
            <select className="input" value={trip.sntAdvanceRequired ? 'yes' : 'no'} onChange={(e) => updateTrip('sntAdvanceRequired', e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>
        <div className="field"><label>Travel Justification *</label><textarea className="input" value={trip.travelJustification} onChange={(e) => updateTrip('travelJustification', e.target.value)} placeholder="Why this trip is necessary" /></div>

        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={trip.multiItinerary} onChange={(e) => { updateTrip('multiItinerary', e.target.checked); setItinerary([]); }} />
            This trip includes multiple itinerary legs (e.g. Joburg then Cape Town, then home)
          </label>
        </div>

        <div className="section-title">{trip.multiItinerary ? `Itinerary Leg ${itinerary.length + 1}` : 'Itinerary'}</div>
        <LegFields leg={legDraft} update={updateLeg} />

        {trip.multiItinerary && (
          <>
            <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 4, marginBottom: 14 }} onClick={addLegToItinerary}>
              <Plus size={14} /> Add This Leg to the Itinerary
            </button>
            {itinerary.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-header" style={{ padding: '10px 14px' }}><h3 style={{ fontSize: 12.5 }}>Itinerary so far ({itinerary.length})</h3></div>
                <div style={{ padding: '4px 14px 10px' }}>
                  {itinerary.map((leg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < itinerary.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12.5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> {legLabel(leg, i)}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeLeg(i)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="hint">Fill in each additional leg's details above, then click "Add This Leg" — repeat for every item on the itinerary, then submit the whole trip.</p>
          </>
        )}

        <p className="hint">Your request will route through the six-stage approval chain: HOD → Travel Office → Bookkeeper/Finance → Finance Manager → CEO → Board Treasurer (for trips above R{'50,000'}).</p>
      </form>
    </Modal>
  );
}
