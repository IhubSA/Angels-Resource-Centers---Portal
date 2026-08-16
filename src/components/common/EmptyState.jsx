export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={34} />}
      <div style={{ fontWeight: 650, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5 }}>{subtitle}</div>}
    </div>
  );
}
