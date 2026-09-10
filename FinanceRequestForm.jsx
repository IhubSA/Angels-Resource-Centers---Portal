import { useState } from 'react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { REQUEST_TYPES, procurementRequirementFor } from '../../data/permissions';

const initialForm = (budgets) => ({
  requestType: 'payment', vendor: '', description: '', category: 'Operations',
  amount: '', budgetId: budgets[0]?.id || '', procurementRef: '', beneficiaryDevelopmentPlan: '',
});

export default function FinanceRequestForm({ open, onClose }) {
  const { submitFinanceRequest, budgets } = useApp();
  const [form, setForm] = useState(() => initialForm(budgets));
  const [error, setError] = useState('');

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  const isApr = form.requestType === 'apr';
  const requirement = procurementRequirementFor(form.amount);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.vendor || !form.description || !form.amount || !form.budgetId) {
      setError('Please complete all required fields.');
      return;
    }
    if (isApr && !form.beneficiaryDevelopmentPlan) {
      setError('Beneficiary Development Plan is required for an Asset Purchase Request.');
      return;
    }
    submitFinanceRequest({ ...form, amount: Number(form.amount) });
    setForm(initialForm(budgets));
    setError('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Finance Hub Request" subtitle="FIN-01 / FIN-02 / FIN-03" footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="finance-request-form" type="submit">Submit Request</button>
      </>
    }>
      <form id="finance-request-form" onSubmit={handleSubmit}>
        {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="field">
          <label>Request Type *</label>
          <select className="input" value={form.requestType} onChange={(e) => update('requestType', e.target.value)}>
            {REQUEST_TYPES.map((rt) => <option key={rt.key} value={rt.key}>{rt.label} ({rt.short})</option>)}
          </select>
        </div>
        <div className="field"><label>Vendor / Payee *</label><input className="input" value={form.vendor} onChange={(e) => update('vendor', e.target.value)} /></div>
        <div className="field"><label>Description *</label><textarea className="input" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What is this request for?" /></div>
        <div className="field-row">
          <div className="field"><label>Amount (ZAR) *</label><input type="number" min="0" className="input" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></div>
          <div className="field"><label>Budget Line *</label>
            <select className="input" value={form.budgetId} onChange={(e) => update('budgetId', e.target.value)}>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Category</label><input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} /></div>
        <div className="field">
          <label>Procurement Reference</label>
          <input className="input" value={form.procurementRef} onChange={(e) => update('procurementRef', e.target.value)} placeholder="Quotation / tender reference (if applicable)" />
          {form.amount && <p className="hint">FIN-03: {requirement}</p>}
        </div>
        {isApr && (
          <div className="field">
            <label>Beneficiary Development Plan *</label>
            <textarea className="input" value={form.beneficiaryDevelopmentPlan} onChange={(e) => update('beneficiaryDevelopmentPlan', e.target.value)} placeholder="How does this asset align with the beneficiary's development plan?" />
          </div>
        )}
        <p className="hint">
          {isApr
            ? 'APR requests route through Entrepreneur Development Advisor → Mentor → Line Manager → Bookkeeper → Accountant → CEO → payment.'
            : 'Your request will route through Line Manager → Bookkeeper → Accountant → CEO → payment.'}
        </p>
      </form>
    </Modal>
  );
}
