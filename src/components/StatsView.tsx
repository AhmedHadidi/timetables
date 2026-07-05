import type { ScheduleResult } from '../types';
import { StatChip, Empty } from './ui';

export default function StatsView({ schedule, fair }: { schedule: ScheduleResult | null; fair: number }) {
  if (!schedule) return <Empty />;
  const { emp } = schedule;
  const maxWork = Math.max(...emp.map((e) => e.stats.work), 1);
  return (
    <div style={{ marginTop: 24 }}>
      <h2 className="disp" style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>الإحصائيات والعدالة</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>تحليل توزيع المناوبات والإجازات على مستوى الشهر</p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatChip label="نسبة العدالة" value={fair + '%'} col={fair >= 80 ? 'var(--good)' : 'var(--warn)'} />
        <StatChip label="إجمالي المناوبات" value={emp.reduce((a, e) => a + e.stats.work, 0)} />
        <StatChip label="مناوبات صباح" value={emp.reduce((a, e) => a + e.stats.morning, 0)} col="var(--morning-line)" />
        <StatChip label="مناوبات مساء" value={emp.reduce((a, e) => a + e.stats.evening, 0)} col="var(--evening-line)" />
        <StatChip label="إجمالي الإجازات" value={emp.reduce((a, e) => a + e.stats.rest, 0)} col="var(--rest-line)" />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '20px 22px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, fontFamily: 'Cairo' }}>توزيع المناوبات لكل موظف</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {emp.slice().sort((a, b) => b.stats.work - a.stats.work).map((e) => {
            const over = e.stats.work >= maxWork && maxWork - Math.min(...emp.map((x) => x.stats.work)) >= 3;
            return (
              <div key={e.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700 }}>{e.name} {over && <span style={{ color: 'var(--warn)', fontSize: 11 }}>⚠ الأكثر تحميلًا</span>}</span>
                  <span style={{ color: 'var(--muted)' }}>{e.stats.work} مناوبة · {e.stats.rest} إجازة · جمعة {e.stats.fri} · سبت {e.stats.sat}</span>
                </div>
                <div style={{ display: 'flex', height: 22, borderRadius: 7, overflow: 'hidden', background: 'var(--parch-2)' }}>
                  <div style={{ width: `${(e.stats.morning / maxWork) * 100}%`, background: 'var(--morning)', transition: '.4s' }} />
                  <div style={{ width: `${(e.stats.evening / maxWork) * 100}%`, background: 'var(--evening)', transition: '.4s' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--morning)', borderRadius: 3, marginInlineEnd: 5, verticalAlign: 'middle' }} />صباح</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: 'var(--evening)', borderRadius: 3, marginInlineEnd: 5, verticalAlign: 'middle' }} />مساء</span>
        </div>
      </div>
    </div>
  );
}
