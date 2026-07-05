export default function Flash({ flash }: { flash: { type: 'good' | 'warn' | 'bad'; msg: string } }) {
  const col = flash.type === 'good' ? 'var(--good)' : flash.type === 'warn' ? 'var(--warn)' : 'var(--bad)';
  return (
    <div style={{
      position: 'fixed', bottom: 24, insetInlineStart: '50%', transform: 'translateX(50%)', zIndex: 100,
      background: 'var(--slate)', color: '#fff', padding: '12px 22px', borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600,
    }}>
      <span style={{ width: 10, height: 10, borderRadius: 9, background: col }} />{flash.msg}
    </div>
  );
}
