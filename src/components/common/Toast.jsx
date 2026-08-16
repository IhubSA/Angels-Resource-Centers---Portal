import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind === 'warn' ? 'warn' : ''}`}>
      {toast.kind === 'warn' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      {toast.message}
    </div>
  );
}
