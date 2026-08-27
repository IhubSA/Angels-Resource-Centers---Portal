import { useState } from 'react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

export default function TravelRequestForm({ open, onClose }) {
  const { submitTravelRequest, budgets, currentUser } = useApp();
  const travelBudgets = budgets.filter((b) => b.category === 'Travel' || b.department === currentUser.department);
  const [form, setForm] = useState({
    destination: '', purpose: '', startDate: '', endDate: '', estimatedCost: '', budgetId: travelBudgets[0]?.id || budgets[0]?.id || '',
  });
  const [error, setError] = useState('');

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.destination || !form.purpose || !form.startDate || !form.endDate || !form.estimatedCost || !form.budgetId) {
      setError('Please complete all required fields.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('End date cannot be before the start date.');
      return;
    }
    submitTravelRequest({ ...form, estimatedCost: Number(form.estimatedCost) });
    setForm({ destination: '', purpose: '', startDate: '', endDate: '', estimatedCost: '', budgetId: travelBudgets[0]?.id || '' });
    setError('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Travel Request" subtitle="Links only — not a full itinerary build" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="travel-request-form" type="submit">Submit Request</button>
      </>
    }>
      <form id="travel-request-form" onSubmit={handleSubmit}>
        {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="field">
          <label>Destination *</label>
          <input className="input" value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="e.g. Durban, KwaZulu-Natal" />
        </div>
        <div className="field">
          <label>Purpose of Travel *</label>
          <textarea className="input" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="Briefly describe the purpose" />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Start Date *</label>
            <input type="date" className="input" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </div>
          <div className="field">
            <label>End Date *</label>
            <input type="date" className="input" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Estimated Cost (ZAR) *</label>
            <input type="number" min="0" className="input" value={form.estimatedCost} onChange={(e) => update('estimatedCost', e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Budget Line *</label>
            <select className="input" value={form.budgetId} onChange={(e) => update('budgetId', e.target.value)}>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <p className="hint">Your request will route through the six-stage approval chain: HOD → Travel Office → Bookkeeper/Finance → Finance Manager → CEO → Board Treasurer (for trips above R{'50,000'}).</p>
      </form>
    </Modal>
  );
}
