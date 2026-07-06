import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { Employee, ScheduleResult, ShiftKind, Issue } from '../types';
import type { AppConfig } from '../App';
import { DAYS, WEEKEND, MONTH_NAMES, SHIFT_META, daysInMonth } from '../lib/engine';
import { buildCalendarWeeks, exportExcel, exportPDF } from '../lib/exporters';
import { Field, Empty, btnGhost, btnPrimary, btnExport, inp, th, tdName } from './ui';

interface Props {
  schedule: ScheduleResult | null;
  setSchedule: (s: ScheduleResult) => void;
  fair: number;
  issues: Issue[];
  config: AppConfig;
  setConfig: (fn: (c: AppConfig) => AppConfig) => void;
  holidayMornings: Set<number>;
  setHolidayMornings: (fn: (s: Set<number>) => Set<number>) => void;
  employees: Employee[];
  onBuild: () => void;
  readOnly?: boolean;
  onSaveSettings: (hm: Set<number>) => Promise<void>;
  onSaveEdits: (s: ScheduleResult) => Promise<void>;
  showFlash: (t: 'good' | 'warn' | 'bad', m: string) => void;
}

function recomputeStats(sched: ScheduleResult) {
  const dow = sched.dowByIndex;
  sched.emp.forEach((e) => {
    e.stats = { morning: 0, evening: 0, rest: 0, xrest: 0, fri: 0, sat: 0, work: 0, weekend: 0, leave: 0, training: 0 };
    e.days.forEach((s, d) => {
      if (s === 'morning') { e.stats.morning++; e.stats.work++; }
      if (s === 'evening') { e.stats.evening++; e.stats.work++; }
      if (s === 'rest') e.stats.rest++;
      if (s === 'xrest') e.stats.xrest++;
      if (s === 'leave') e.stats.leave++;
      if (s === 'training') e.stats.training++;
      if (s === 'morning' || s === 'evening') {
        if (dow[d] === 5) { e.stats.fri++; e.stats.weekend++; }
        if (dow[d] === 6) { e.stats.sat++; e.stats.weekend++; }
      }
    });
  });
}

export default function ScheduleView(p: Props) {
  const { schedule, setSchedule } = p;
  const [showConfig, setShowConfig] = useState(false);
  const [drag, setDrag] = useState<{ ei: number; d: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // عند تغيّر الشهر المعروض، تُلغى حالة "غير محفوظ"
  useEffect(() => { setDirty(false); }, [schedule?.year, schedule?.month]);
  if (!schedule) return <Empty />;
  const { emp, year, month } = schedule;
  const calWeeks = buildCalendarWeeks(schedule);

  const setCell = (ei: number, d: number, val: ShiftKind) => {
    if (p.readOnly) return;
    const copy: ScheduleResult = { ...schedule, emp: schedule.emp.map((e) => ({ ...e, days: [...e.days] })) };
    copy.emp[ei].days[d] = val;
    recomputeStats(copy);
    setSchedule(copy);
    setDirty(true);
  };
  const onDrop = (ei: number, d: number) => {
    if (p.readOnly) return;
    if (!drag) return;
    if (drag.ei === ei && drag.d === d) { setDrag(null); return; }
    const copy: ScheduleResult = { ...schedule, emp: schedule.emp.map((e) => ({ ...e, days: [...e.days] })) };
    const a = copy.emp[drag.ei].days[drag.d];
    copy.emp[drag.ei].days[drag.d] = copy.emp[ei].days[d];
    copy.emp[ei].days[d] = a;
    recomputeStats(copy);
    setSchedule(copy);
    setDrag(null);
    setDirty(true);
    p.showFlash('good', 'تم تبديل المناوبتين');
  };
  const saveEdits = async () => {
    setSaving(true);
    try { await p.onSaveEdits(schedule); setDirty(false); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch', margin: '22px 0 14px' }}>
        <FairnessCard fair={p.fair} />
        <IssuesCard issues={p.issues} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          {!p.readOnly && (
            <button onClick={saveEdits} disabled={!dirty || saving}
              style={{
                padding: '11px 22px', borderRadius: 11, fontFamily: 'Cairo', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                background: dirty ? 'linear-gradient(135deg,var(--good),#059669)' : 'var(--parch-2)',
                color: dirty ? '#fff' : 'var(--muted)',
                boxShadow: dirty ? '0 4px 14px rgba(16,185,129,.35)' : 'none',
                cursor: dirty && !saving ? 'pointer' : 'default',
              }}>
              💾 {saving ? '...جارٍ الحفظ' : dirty ? 'حفظ التعديلات' : 'محفوظ'}
            </button>
          )}
          {!p.readOnly && <button onClick={() => setShowConfig((s) => !s)} style={btnGhost}>⚙️ إعدادات التوزيع</button>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => exportExcel(schedule)} style={btnExport}>📊 Excel</button>
            <button onClick={() => exportPDF(schedule)} style={btnExport}>📄 PDF</button>
            <button onClick={() => window.print()} style={btnExport}>🖨 طباعة</button>
          </div>
        </div>
      </div>

      {showConfig && !p.readOnly && (
        <ConfigPanel config={p.config} setConfig={p.setConfig} employees={p.employees}
          holidayMornings={p.holidayMornings} setHolidayMornings={p.setHolidayMornings}
          onBuild={p.onBuild} onSaveSettings={p.onSaveSettings} />
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 12px' }}>
        <h2 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{MONTH_NAMES[month - 1]} {year}</h2>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{schedule.N} يومًا</span>
      </div>

      <Legend />

      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 16, background: '#fff', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
        {calWeeks.map((week, w) => (
          <WeekBlock key={w} w={w} week={week} emp={emp} setCell={setCell} drag={drag} setDrag={setDrag} onDrop={onDrop} readOnly={p.readOnly} />
        ))}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12, lineHeight: 1.7 }}>
        💡 النمط: كل موظف يدور على <b>٥ مساء ← يومان إجازة ← ٥ صباح ← يومان إجازة</b>. المساء موظف واحد فقط يوميًا، والصباح حسب المتاح.
        {!p.readOnly && ' اسحب أي خلية فوق أخرى للتبديل، أو اضغط عليها لتعديلها يدويًا.'}
      </p>
    </div>
  );
}

function WeekBlock({ w, week, emp, setCell, drag, setDrag, onDrop, readOnly }: any) {
  const nums = week.filter((x: number | null) => x !== null).map((i: number) => i + 1);
  const range = nums.length ? `${nums[0]}–${nums[nums.length - 1]}` : '';
  return (
    <div style={{ borderBottom: '8px solid var(--parch)' }}>
      <div style={{ background: 'var(--slate)', color: '#fff', padding: '8px 16px', fontWeight: 700, fontFamily: 'Cairo', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
        <span>الأسبوع {w + 1}</span>
        <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 500 }}>أيام الشهر {range}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ ...th, position: 'sticky', insetInlineStart: 0, background: 'var(--parch-2)', zIndex: 2, minWidth: 130 }}>الموظف</th>
            {DAYS.map((d, i) => {
              const dayNum = week[i] !== null ? week[i] + 1 : null;
              return (
                <th key={i} style={{ ...th, background: WEEKEND.has(i) ? '#FDF2F8' : 'var(--parch-2)' }}>
                  {d}
                  <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 800 }}>{dayNum || '·'}</div>
                  {WEEKEND.has(i) && <div style={{ fontSize: 9, color: 'var(--rest-line)', fontWeight: 600 }}>مساء فقط</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {emp.map((e: any, ei: number) => (
            <tr key={e.id}>
              <td style={{ ...tdName, position: 'sticky', insetInlineStart: 0, background: '#fff', zIndex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{e.role}</div>
              </td>
              {DAYS.map((_, di) => {
                const d = week[di];
                if (d === null) return <td key={di} style={{ background: '#FAFAF8', borderInlineStart: '1px solid var(--line)' }} />;
                return <Cell key={d} s={e.days[d]} ei={ei} d={d} dow={di} drag={drag} setDrag={setDrag} onDrop={onDrop} setCell={setCell} readOnly={readOnly} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ s, ei, d, dow, drag, setDrag, onDrop, setCell, readOnly }: any) {
  const [menu, setMenu] = useState(false);
  const m = SHIFT_META[s as ShiftKind] || SHIFT_META.rest;
  const isDragging = drag && drag.ei === ei && drag.d === d;
  const bg: Record<string, string> = { morning: 'var(--morning-bg)', evening: 'var(--evening-bg)', rest: 'var(--rest-bg)', xrest: 'var(--xrest-bg)', holiday: 'var(--holiday-bg)', leave: 'var(--leave-bg)', training: 'var(--training-bg)' };
  const line: Record<string, string> = { morning: 'var(--morning-line)', evening: 'var(--evening-line)', rest: 'var(--rest-line)', xrest: 'var(--xrest-line)', holiday: 'var(--holiday-line)', leave: 'var(--leave-line)', training: 'var(--training-line)' };
  return (
    <td style={{ padding: 4, textAlign: 'center', position: 'relative', background: WEEKEND.has(dow) ? '#FEFAFB' : 'transparent', borderInlineStart: '1px solid var(--line)' }}>
      <div
        draggable={!readOnly}
        onDragStart={readOnly ? undefined : () => setDrag({ ei, d })}
        onDragOver={readOnly ? undefined : (ev) => ev.preventDefault()}
        onDrop={readOnly ? undefined : () => onDrop(ei, d)}
        onClick={readOnly ? undefined : () => setMenu((x) => !x)}
        style={{ background: bg[m.cls], border: `1.5px solid ${line[m.cls]}`, borderRadius: 9, padding: '7px 4px', cursor: readOnly ? 'default' : 'grab', opacity: isDragging ? 0.4 : 1, transition: '.12s', userSelect: 'none', boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,.15)' : 'none' }}>
        <div style={{ fontSize: 15, lineHeight: 1 }}>{m.ic}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: line[m.cls], marginTop: 2 }}>{m.label}</div>
      </div>
      {menu && !readOnly && <CellMenu onPick={(v) => { setCell(ei, d, v); setMenu(false); }} onClose={() => setMenu(false)} dow={dow} />}
    </td>
  );
}

function CellMenu({ onPick, onClose, dow }: { onPick: (v: ShiftKind) => void; onClose: () => void; dow: number }) {
  const opts: [ShiftKind, string, boolean][] = [
    ['morning', '🌞 صباح', WEEKEND.has(dow)],
    ['evening', '🌙 مساء', false],
    ['rest', '— إجازة', false],
    ['xrest', '★ إجازة استثنائية', false],
    ['leave', '✈ إجازة سنوية', false],
    ['training', '🎓 دورة تدريبية', false],
    ['holiday', '⚑ عطلة رسمية', false],
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
      <div style={{ position: 'absolute', top: '100%', insetInlineStart: '50%', transform: 'translateX(50%)', marginTop: 4, zIndex: 41, background: '#fff', border: '1px solid var(--line)', borderRadius: 11, boxShadow: '0 10px 30px rgba(0,0,0,.18)', padding: 5, minWidth: 160 }}>
        {opts.map(([v, l, dis]) => (
          <button key={v} disabled={dis} onClick={() => onPick(v)}
            style={{ display: 'block', width: '100%', textAlign: 'start', padding: '8px 10px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: dis ? '#CBD5E1' : 'var(--ink)', cursor: dis ? 'not-allowed' : 'pointer' }}>
            {l}{dis && ' (غير متاح)'}
          </button>
        ))}
      </div>
    </>
  );
}

function Legend() {
  const items: [string, string, string, string][] = [
    ['morning', 'صباح', 'var(--morning-bg)', 'var(--morning-line)'],
    ['evening', 'مساء', 'var(--evening-bg)', 'var(--evening-line)'],
    ['rest', 'إجازة', 'var(--rest-bg)', 'var(--rest-line)'],
    ['xrest', 'إجازة استثنائية', 'var(--xrest-bg)', 'var(--xrest-line)'],
    ['leave', 'إجازة سنوية', 'var(--leave-bg)', 'var(--leave-line)'],
    ['training', 'دورة تدريبية', 'var(--training-bg)', 'var(--training-line)'],
    ['holiday', 'عطلة رسمية', 'var(--holiday-bg)', 'var(--holiday-line)'],
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 14px' }}>
      {items.map(([k, l, bg, ln]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', padding: '6px 12px', borderRadius: 9, border: '1px solid var(--line)', fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: bg, border: `1.5px solid ${ln}` }} />{l}
        </div>
      ))}
    </div>
  );
}

function FairnessCard({ fair }: { fair: number }) {
  const col = fair >= 80 ? 'var(--good)' : fair >= 60 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div style={{ background: 'var(--slate)', color: '#fff', borderRadius: 16, padding: '18px 22px', minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>نسبة العدالة بين الموظفين</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <div className="disp" style={{ fontSize: 44, fontWeight: 900, color: col, lineHeight: 1 }}>{fair}</div>
        <span style={{ fontSize: 16, color: '#94A3B8' }}>%</span>
      </div>
      <div style={{ height: 6, background: 'var(--slate-3)', borderRadius: 6, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${fair}%`, background: col, transition: '.4s' }} />
      </div>
    </div>
  );
}

function IssuesCard({ issues }: { issues: Issue[] }) {
  const bad = issues.filter((i) => i.type === 'bad').length;
  const warn = issues.filter((i) => i.type === 'warn').length;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 20px', minWidth: 230, flex: 1, maxHeight: 150, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>التنبيهات الذكية</span>
        <span style={{ fontSize: 12, color: 'var(--bad)', fontWeight: 700 }}>● {bad} تعارض</span>
        <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 700 }}>● {warn} تحذير</span>
      </div>
      {issues.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--good)', fontWeight: 600 }}>✓ لا توجد تعارضات — الجدول مطابق لجميع القواعد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {issues.slice(0, 6).map((i, ix) => (
            <div key={ix} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: i.type === 'bad' ? 'var(--bad)' : 'var(--warn)' }}>●</span>
              <span><b>{i.emp}</b>: {i.msg}</span>
            </div>
          ))}
          {issues.length > 6 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{issues.length - 6} أخرى…</div>}
        </div>
      )}
    </div>
  );
}

function ConfigPanel({ config, setConfig, employees, holidayMornings, setHolidayMornings, onBuild, onSaveSettings }: any) {
  const upd = (k: string, v: any) => setConfig((c: AppConfig) => ({ ...c, [k]: v }));
  const toggleHoli = async (d: number) => {
    const n = new Set(holidayMornings);
    n.has(d) ? n.delete(d) : n.add(d);
    setHolidayMornings(() => n);
    await onSaveSettings(n);
  };
  const daysN = daysInMonth(config.year, config.month);
  const eveningEligible = (employees || []).filter((e: Employee) => e.active && !e.constraints?.morningOnly && !e.constraints?.official && !e.constraints?.noWeekend);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 20, marginBottom: 18, display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <Field label="الشهر">
        <select value={config.month} onChange={(e) => setConfig((c: AppConfig) => ({ ...c, month: +e.target.value, startDay: 1 }))} style={inp}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </Field>
      <Field label="السنة">
        <input type="number" min="2020" max="2100" value={config.year} onChange={(e) => upd('year', +e.target.value)} style={{ ...inp, width: 100 }} />
      </Field>
      <Field label="يبدأ الدوران من يوم">
        <select value={config.startDay || 1} onChange={(e) => upd('startDay', +e.target.value)} style={inp}>
          {Array.from({ length: daysN }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
      </Field>
      <Field label="أول مناوب مساء">
        <select value={config.firstEveningId || ''} onChange={(e) => upd('firstEveningId', e.target.value || null)} style={inp}>
          <option value="">تلقائي</option>
          {eveningEligible.map((e: Employee) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="صباح استثنائي (أعياد)">
        <div style={{ display: 'flex', gap: 6 }}>
          {([['الجمعة', 5], ['السبت', 6]] as [string, number][]).map(([l, d]) => (
            <button key={d} onClick={() => toggleHoli(d)} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${holidayMornings.has(d) ? 'var(--holiday-line)' : 'var(--line)'}`, background: holidayMornings.has(d) ? 'var(--holiday-bg)' : '#fff', color: holidayMornings.has(d) ? 'var(--holiday-line)' : 'var(--muted)' }}>{l}</button>
          ))}
        </div>
      </Field>
      <button onClick={onBuild} style={{ ...btnPrimary, marginInlineStart: 'auto' }}>↻ إعادة التوليد</button>
    </div>
  );
}
