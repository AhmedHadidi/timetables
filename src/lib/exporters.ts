import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScheduleResult } from '../types';
import { DAYS, DAY_KEYS, MONTH_NAMES, SHIFT_META } from './engine';

/** بناء أسابيع تقويمية: كل أسبوع 7 خانات (أحد..سبت) مع فهرس اليوم أو null */
export function buildCalendarWeeks(sched: ScheduleResult): (number | null)[][] {
  const { N, dowByIndex } = sched;
  const weeks: (number | null)[][] = [];
  let cur: (number | null)[] = new Array(7).fill(null);
  let placed = false;
  for (let i = 0; i < N; i++) {
    const dow = dowByIndex[i];
    if (dow === 0 && placed) { weeks.push(cur); cur = new Array(7).fill(null); }
    cur[dow] = i;
    placed = true;
  }
  weeks.push(cur);
  return weeks;
}

export function exportExcel(sched: ScheduleResult) {
  const { emp, year, month } = sched;
  const weeks = buildCalendarWeeks(sched);
  const rows: any[][] = [];
  rows.push([`جدول مناوبات ${MONTH_NAMES[month - 1]} ${year}`]);
  rows.push([]);
  weeks.forEach((week, w) => {
    rows.push([`الأسبوع ${w + 1}`, ...DAYS]);
    rows.push(['التاريخ', ...week.map((i) => (i !== null ? i + 1 : ''))]);
    emp.forEach((e) => {
      rows.push([e.name, ...week.map((i) => (i !== null ? SHIFT_META[e.days[i]!]?.label || '' : ''))]);
    });
    rows.push([]);
  });
  rows.push(['الإحصائيات']);
  rows.push(['الموظف', 'مناوبات', 'صباح', 'مساء', 'إجازات', 'إجازة سنوية', 'دورة تدريبية', 'جمعة', 'سبت']);
  emp.forEach((e) =>
    rows.push([e.name, e.stats.work, e.stats.morning, e.stats.evening, e.stats.rest, e.stats.leave, e.stats.training, e.stats.fri, e.stats.sat]),
  );
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المناوبات');
  XLSX.writeFile(wb, `جدول_المناوبات_${MONTH_NAMES[month - 1]}_${year}.xlsx`);
}

export function exportPDF(sched: ScheduleResult) {
  const { emp, year, month } = sched;
  const weeks = buildCalendarWeeks(sched);
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(15);
  doc.text(`Shift Schedule - ${MONTH_NAMES[month - 1]} ${year}`, 14, 15);
  let y = 22;
  const code: Record<string, string> = { morning: 'AM', evening: 'PM', rest: 'OFF', xrest: 'X-OFF', holiday: 'HOL', leave: 'LEAVE', training: 'TRAIN' };
  weeks.forEach((week, w) => {
    const head = [['Emp', ...DAYS.map((_, i) => (week[i] !== null ? `${DAY_KEYS[i]} ${week[i]! + 1}` : DAY_KEYS[i]))]];
    const body = emp.map((e) => [e.name, ...week.map((i) => (i === null ? '' : code[e.days[i] as string] || ''))]);
    autoTable(doc, {
      head, body, startY: y,
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        const t = data.cell.raw;
        if (t === 'AM') data.cell.styles.fillColor = [254, 243, 199];
        if (t === 'PM') data.cell.styles.fillColor = [224, 231, 255];
        if (t === 'OFF') data.cell.styles.fillColor = [255, 228, 230];
        if (t === 'LEAVE') data.cell.styles.fillColor = [224, 242, 254];
        if (t === 'TRAIN') data.cell.styles.fillColor = [204, 251, 241];
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (y > 175 && w < weeks.length - 1) { doc.addPage(); y = 15; }
  });
  doc.save(`shift_schedule_${MONTH_NAMES[month - 1]}_${year}.pdf`);
}
