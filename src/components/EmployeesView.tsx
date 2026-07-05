import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Employee, ScheduleResult, Constraints } from '../types';
import { DAYS } from '../lib/engine';
import * as api from '../lib/api';
import { Field, Tag, btnPrimary, btnGhost, iconBtn, inp, th } from './ui';

const CONSTRAINT_DEFS: { key: keyof Constraints; label: string }[] = [
  { key: 'morningOnly', label: 'يعمل صباح فقط' },
  { key: 'eveningOnly', label: 'يعمل مساء فقط' },
  { key: 'noWeekend', label: 'لا يناوب الجمعة والسبت' },
  { key: 'official', label: 'دوام رسمي (أحد–خميس صباحًا)' },
];

interface Props {
  employees: Employee[];
  setEmployees: (fn: (e: Employee[]) => Employee[]) => void;
  schedule: ScheduleResult | null;
  readOnly?: boolean;
  showFlash: (t: 'good' | 'warn' | 'bad', m: string) => void;
}

export default function EmployeesView({ employees, setEmployees, schedule, readOnly, showFlash }: Props) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const statsFor = (id: string) => schedule?.emp.find((e) => e.id === id)?.stats;

  const addEmp = () => setEditing({ id: '', name: '', role: '', active: true, constraints: {}, prefers: null });

  const save = async (e: Employee) => {
    setBusy(true);
    try {
      if (e.id) {
        const saved = await api.upsertEmployee(e);
        setEmployees((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      } else {
        const created = await api.insertEmployee(e);
        setEmployees((prev) => [...prev, created]);
      }
      setEditing(null);
      showFlash('good', 'تم حفظ الموظف');
    } catch (err) {
      console.error(err);
      showFlash('bad', 'تعذّر الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm('حذف هذا الموظف نهائيًا؟')) return;
    try {
      await api.deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      showFlash('good', 'تم الحذف');
    } catch (err) {
      showFlash('bad', 'تعذّر الحذف');
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="disp" style={{ fontSize: 24, fontWeight: 800 }}>إدارة الموظفين</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
            {readOnly
              ? <span style={{ color: 'var(--evening-line)', fontWeight: 700 }}>👁️ وضع العرض فقط</span>
              : <><span style={{ color: 'var(--good)', fontWeight: 700 }}>● محفوظ في السحابة</span> — البيانات في Supabase وتتشارك بين الأجهزة.</>}
          </p>
        </div>
        {!readOnly && <button onClick={addEmp} style={btnPrimary}>＋ إضافة موظف</button>}
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid var(--line)', borderRadius: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ background: 'var(--parch-2)' }}>
              {['الاسم', 'الوظيفة', 'الحالة', 'القيود الخاصة', 'مناوبات', 'إجازات', 'جمعة', 'سبت', ''].map((h, i) => (
                <th key={i} style={{ ...th, textAlign: i === 0 ? 'start' : 'center', padding: '12px 14px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const st = statsFor(e.id);
              const cons = Object.keys(e.constraints || {}).filter((k) => (e.constraints as any)[k]);
              return (
                <tr key={e.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{e.name}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--muted)' }}>{e.role || '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: e.active ? '#DCFCE7' : '#FEE2E2', color: e.active ? '#166534' : '#991B1B' }}>
                      {e.active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', maxWidth: 240 }}>
                    {(cons.length || e.constraints?.annualLeave || e.constraints?.training || e.prefers) ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {cons.filter((c) => c !== 'annualLeave' && c !== 'training').map((c) => {
                          const def = CONSTRAINT_DEFS.find((x) => x.key === c);
                          return def ? <Tag key={c}>{def.label}</Tag> : null;
                        })}
                        {e.constraints?.annualLeave?.from && <Tag>✈ سنوية: {e.constraints.annualLeave.from} → {e.constraints.annualLeave.to}</Tag>}
                        {e.constraints?.training?.from && <Tag>🎓 دورة: {e.constraints.training.from} → {e.constraints.training.to}</Tag>}
                        {e.prefers && <Tag>يفضّل {e.prefers === 'morning' ? 'صباح' : 'مساء'}</Tag>}
                      </div>
                    ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{st ? st.work : '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>{st ? st.rest : '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>{st ? st.fri : '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>{st ? st.sat : '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {readOnly ? <span style={{ color: '#CBD5E1' }}>—</span> : <>
                      <button onClick={() => setEditing(e)} style={iconBtn}>✎</button>
                      <button onClick={() => del(e.id)} style={{ ...iconBtn, color: 'var(--bad)' }}>🗑</button>
                    </>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <EmpModal emp={editing} busy={busy} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EmpModal({ emp, busy, onSave, onClose }: { emp: Employee; busy: boolean; onSave: (e: Employee) => void; onClose: () => void }) {
  const [f, setF] = useState<Employee>({ ...emp, constraints: { ...emp.constraints } });
  const setLeave = (field: 'from' | 'to', val: string) =>
    setF((p) => {
      const al = { ...(p.constraints.annualLeave || {}), [field]: val || undefined };
      if (!al.from && !al.to) return { ...p, constraints: { ...p.constraints, annualLeave: undefined } };
      return { ...p, constraints: { ...p.constraints, annualLeave: al } };
    });
  const setTraining = (field: 'from' | 'to', val: string) =>
    setF((p) => {
      const tr = { ...(p.constraints.training || {}), [field]: val || undefined };
      if (!tr.from && !tr.to) return { ...p, constraints: { ...p.constraints, training: undefined } };
      return { ...p, constraints: { ...p.constraints, training: tr } };
    });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 26, width: 'min(560px,100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h3 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>{emp.id ? 'تعديل موظف' : 'موظف جديد'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <Field label="الاسم"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={inp} placeholder="الاسم الكامل" /></Field>
          <Field label="الوظيفة"><input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={inp} placeholder="مثال: فني" /></Field>
        </div>
        <Field label="الحالة">
          <div style={{ display: 'flex', gap: 8 }}>
            {[[true, 'نشط'], [false, 'غير نشط']].map(([v, l]) => (
              <button key={String(v)} onClick={() => setF({ ...f, active: v as boolean })} style={{ padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13, border: `1.5px solid ${f.active === v ? 'var(--slate)' : 'var(--line)'}`, background: f.active === v ? 'var(--slate)' : '#fff', color: f.active === v ? '#fff' : 'var(--muted)' }}>{l as string}</button>
            ))}
          </div>
        </Field>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--slate)' }}>القيود الخاصة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CONSTRAINT_DEFS.map((c) => {
              const disabled =
                (c.key === 'eveningOnly' && (f.constraints.official || f.constraints.morningOnly)) ||
                (c.key === 'morningOnly' && (f.constraints.official || f.constraints.eveningOnly)) ||
                ((c.key === 'morningOnly' || c.key === 'noWeekend') && f.constraints.official);
              return (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, border: '1px solid var(--line)', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, background: (f.constraints as any)[c.key] ? 'var(--parch)' : '#fff' }}>
                  <input type="checkbox" disabled={!!disabled} checked={!!(f.constraints as any)[c.key]}
                    onChange={(e) => {
                      const on = e.target.checked || undefined;
                      setF((p) => {
                        const k: Constraints = { ...p.constraints, [c.key]: on };
                        if (c.key === 'official' && on) { k.eveningOnly = undefined; k.morningOnly = undefined; k.noWeekend = undefined; }
                        if ((c.key === 'eveningOnly' || c.key === 'morningOnly') && on) { if (c.key === 'eveningOnly') k.morningOnly = undefined; else k.eveningOnly = undefined; }
                        return { ...p, constraints: k };
                      });
                    }} />
                  {c.label}
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 16, background: 'var(--leave-bg)', border: '1px solid var(--leave-line)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--leave-line)' }}>✈ إجازة سنوية (من – إلى)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="من تاريخ"><input type="date" value={f.constraints.annualLeave?.from || ''} onChange={(e) => setLeave('from', e.target.value)} style={inp} /></Field>
            <Field label="إلى تاريخ"><input type="date" value={f.constraints.annualLeave?.to || ''} onChange={(e) => setLeave('to', e.target.value)} style={inp} /></Field>
          </div>
          {f.constraints.annualLeave?.from && <button onClick={() => setF((p) => ({ ...p, constraints: { ...p.constraints, annualLeave: undefined } }))} style={{ marginTop: 8, fontSize: 12, color: 'var(--bad)', fontWeight: 700 }}>✕ إلغاء الإجازة السنوية</button>}
        </div>

        <div style={{ marginTop: 16, background: 'var(--training-bg)', border: '1px solid var(--training-line)', borderRadius: 11, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--training-line)' }}>🎓 دورة تدريبية (من – إلى)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="من تاريخ"><input type="date" value={f.constraints.training?.from || ''} onChange={(e) => setTraining('from', e.target.value)} style={inp} /></Field>
            <Field label="إلى تاريخ"><input type="date" value={f.constraints.training?.to || ''} onChange={(e) => setTraining('to', e.target.value)} style={inp} /></Field>
          </div>
          {f.constraints.training?.from && <button onClick={() => setF((p) => ({ ...p, constraints: { ...p.constraints, training: undefined } }))} style={{ marginTop: 8, fontSize: 12, color: 'var(--bad)', fontWeight: 700 }}>✕ إلغاء الدورة التدريبية</button>}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--slate)' }}>يفضّل مناوبة</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[null, 'بدون'], ['morning', 'صباح'], ['evening', 'مساء']].map(([v, l]) => (
              <button key={String(v)} onClick={() => setF({ ...f, prefers: v as any })} style={{ padding: '8px 16px', borderRadius: 9, fontWeight: 700, fontSize: 13, border: `1.5px solid ${f.prefers === v ? 'var(--evening-line)' : 'var(--line)'}`, background: f.prefers === v ? 'var(--evening-bg)' : '#fff', color: f.prefers === v ? 'var(--evening-line)' : 'var(--muted)' }}>{l as string}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>إلغاء</button>
          <button onClick={() => f.name.trim() && onSave(f)} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? '...' : 'حفظ'}</button>
        </div>
      </div>
    </div>
  );
}
