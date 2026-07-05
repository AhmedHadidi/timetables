import type { CSSProperties, ReactNode } from 'react';

export const inp: CSSProperties = { padding: '9px 12px', border: '1.5px solid var(--line)', borderRadius: 9, fontSize: 14, outline: 'none', width: '100%', background: '#fff' };
export const btnPrimary: CSSProperties = { padding: '11px 22px', borderRadius: 11, background: 'var(--slate)', color: '#fff', fontWeight: 800, fontFamily: 'Cairo', fontSize: 14 };
export const btnGhost: CSSProperties = { padding: '11px 20px', borderRadius: 11, background: '#fff', border: '1.5px solid var(--line)', fontWeight: 700, fontSize: 14, color: 'var(--slate-3)' };
export const btnExport: CSSProperties = { padding: '9px 16px', borderRadius: 10, background: '#fff', border: '1.5px solid var(--line)', fontWeight: 700, fontSize: 13, color: 'var(--slate-3)' };
export const iconBtn: CSSProperties = { padding: '6px 9px', borderRadius: 8, fontSize: 15, color: 'var(--slate-3)' };
export const th: CSSProperties = { padding: '10px 8px', fontSize: 12.5, fontWeight: 800, color: 'var(--slate-3)', textAlign: 'center', fontFamily: 'Cairo', whiteSpace: 'nowrap' };
export const tdName: CSSProperties = { padding: '8px 12px', borderInlineEnd: '2px solid var(--parch-2)' };

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate-3)' }}>{label}</span>
    {children}
  </label>
);

export const Tag = ({ children }: { children: ReactNode }) => (
  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: 'var(--parch-2)', color: 'var(--slate-3)' }}>{children}</span>
);

export const StatChip = ({ label, value, col }: { label: string; value: ReactNode; col?: string }) => (
  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 20px', minWidth: 130 }}>
    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
    <div className="disp" style={{ fontSize: 28, fontWeight: 900, color: col || 'var(--slate)', marginTop: 2 }}>{value}</div>
  </div>
);

export const Empty = () => (
  <div style={{ marginTop: 60, textAlign: 'center', color: 'var(--muted)' }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
    <p style={{ fontSize: 16, fontWeight: 600 }}>اضغط «إنشاء جدول الشهر» لبدء التوليد</p>
  </div>
);
