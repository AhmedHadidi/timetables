import { useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { ADMIN_EMAILS } from '../lib/config';

export default function Login({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        // رسائل أوضح للأخطاء الشائعة
        if (/fetch/i.test(error.message)) {
          setErr('تعذّر الاتصال بالخادم — تحقق من ضبط متغيرات Supabase في Vercel/‏.env');
        } else if (/invalid/i.test(error.message)) {
          setErr('البريد أو كلمة المرور غير صحيحة');
        } else {
          setErr(error.message);
        }
      }
    } catch (e: any) {
      setErr(e?.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: 'min(420px,100%)', background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 30, boxShadow: '0 10px 40px rgba(15,23,42,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,var(--morning),var(--evening))', display: 'grid', placeItems: 'center', fontSize: 22 }}>🗓️</div>
          <div>
            <div className="disp" style={{ fontWeight: 800, fontSize: 20 }}>نظام المناوبات الذكي</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>تسجيل دخول الإدارة</div>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>البريد الإلكتروني</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={ADMIN_EMAILS[0]}
          style={inp} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="email" />

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '14px 0 6px' }}>كلمة المرور</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••"
          style={inp} onKeyDown={(e) => e.key === 'Enter' && submit()} autoComplete="current-password" />

        {err && <div style={{ color: 'var(--bad)', fontSize: 13, marginTop: 12, fontWeight: 600, lineHeight: 1.6 }}>{err}</div>}

        <button onClick={submit} disabled={busy}
          style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 11, background: 'var(--slate)', color: '#fff', fontWeight: 800, fontFamily: 'Cairo', fontSize: 15, opacity: busy ? 0.6 : 1 }}>
          {busy ? '...' : 'تسجيل الدخول'}
        </button>

        {onBack && (
          <button onClick={onBack}
            style={{ width: '100%', marginTop: 10, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            ← العودة لعرض الجدول
          </button>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: '11px 12px', border: '1.5px solid var(--line)', borderRadius: 10,
  fontSize: 14, outline: 'none', width: '100%', background: '#fff',
};
