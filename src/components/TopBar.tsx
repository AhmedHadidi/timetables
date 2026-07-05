interface Props {
  tab: string;
  setTab: (t: 'schedule' | 'employees' | 'stats') => void;
  canEdit: boolean;
  onBuild: () => void;
  onSignOut: () => void;
  onLogin: () => void;
  email: string;
}

export default function TopBar({ tab, setTab, canEdit, onBuild, onSignOut, onLogin, email }: Props) {
  const tabs: [string, string, string][] = [
    ['schedule', 'الجدول', '▦'],
    ['employees', 'الموظفون', '☰'],
    ['stats', 'الإحصائيات', '▤'],
  ];
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, background: 'var(--slate)', color: '#fff',
      padding: '14px clamp(12px,3vw,32px)', display: 'flex', alignItems: 'center', gap: 20,
      flexWrap: 'wrap', boxShadow: '0 2px 20px rgba(15,23,42,.18)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,var(--morning),var(--evening))', display: 'grid', placeItems: 'center', fontSize: 19 }}>🗓️</div>
        <div>
          <div className="disp" style={{ fontWeight: 800, fontSize: 19, lineHeight: 1 }}>نظام المناوبات الذكي</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>جدولة آلية بمحرك الدوران والعدالة</div>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: 4, background: 'var(--slate-2)', padding: 4, borderRadius: 12 }}>
        {tabs.map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k as any)} style={{
            padding: '8px 16px', borderRadius: 9, fontWeight: 700, fontSize: 14,
            color: tab === k ? 'var(--slate)' : '#CBD5E1', background: tab === k ? '#fff' : 'transparent',
            transition: '.15s', fontFamily: 'Cairo',
          }}>
            <span style={{ marginLeft: 6 }}>{ic}</span>{l}
          </button>
        ))}
      </nav>
      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {canEdit ? (
          <>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{email}</span>
            <button onClick={onBuild} style={{
              padding: '11px 22px', borderRadius: 11, background: 'linear-gradient(135deg,var(--morning),var(--morning-line))',
              color: '#3b2a00', fontWeight: 800, fontFamily: 'Cairo', fontSize: 15,
              boxShadow: '0 4px 14px rgba(245,158,11,.4)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 17 }}>⚡</span> إنشاء جدول الشهر
            </button>
            <button onClick={onSignOut} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--slate-2)', color: '#CBD5E1', fontWeight: 700, fontSize: 13 }}>خروج</button>
          </>
        ) : (
          <button onClick={onLogin} style={{
            padding: '11px 22px', borderRadius: 11, background: '#fff',
            color: 'var(--slate)', fontWeight: 800, fontFamily: 'Cairo', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            🔑 تسجيل دخول الإدارة
          </button>
        )}
      </div>
    </header>
  );
}
