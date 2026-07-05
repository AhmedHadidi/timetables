import type {
  Employee,
  ScheduledEmployee,
  ScheduleConfig,
  ScheduleResult,
  ShiftKind,
  Issue,
  Constraints,
} from '../types';

export const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const WEEKEND = new Set([5, 6]);
export const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const SHIFT = {
  MORNING: 'morning',
  EVENING: 'evening',
  REST: 'rest',
  XREST: 'xrest',
  HOLIDAY: 'holiday',
  LEAVE: 'leave',
  TRAINING: 'training',
} as const;

export const SHIFT_META: Record<ShiftKind, { label: string; ic: string; cls: string }> = {
  morning: { label: 'صباح', ic: '🌞', cls: 'morning' },
  evening: { label: 'مساء', ic: '🌙', cls: 'evening' },
  rest: { label: 'إجازة', ic: '—', cls: 'rest' },
  xrest: { label: 'إجازة استثنائية', ic: '★', cls: 'xrest' },
  holiday: { label: 'عطلة رسمية', ic: '⚑', cls: 'holiday' },
  leave: { label: 'إجازة سنوية', ic: '✈', cls: 'leave' },
  training: { label: 'دورة تدريبية', ic: '🎓', cls: 'training' },
};

/* أدوات التقويم */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
export function dowOfDate(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}
export function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const c = (e: Employee): Constraints => e.constraints || {};

/**
 * محرك الدوران الثابت:
 * كل موظف يدور على 5 مساء ← يومان إجازة ← 5 صباح ← يومان إجازة.
 * - المساء موظف واحد فقط يوميًا (فترات 5 أيام متتالية بلا تداخل).
 * - فترة المساء إجبارية 5 أيام؛ والإجازة/الدورة تُخرجه من التغطية فيغطّي غيره.
 * - القيود الخاصة تُحترم فوق الدوران.
 * - استمرارية بين الأشهر عبر carryOver / endState.
 */
export function generateSchedule(employees: Employee[], config: ScheduleConfig): ScheduleResult {
  const {
    year,
    month,
    holidayMorningDays = new Set<number>(),
    startDay = 1,
    firstEveningId = null,
    carryOver = null,
  } = config;

  const N = daysInMonth(year, month);
  const dowByIndex = Array.from({ length: N }, (_, i) => dowOfDate(year, month, i + 1));
  const dateByIndex = Array.from({ length: N }, (_, i) => isoDate(year, month, i + 1));

  const active = employees.filter((e) => e.active);
  const emp: ScheduledEmployee[] = active.map((e) => ({
    ...e,
    days: new Array<ShiftKind | null>(N).fill(null),
    stats: { morning: 0, evening: 0, rest: 0, xrest: 0, fri: 0, sat: 0, work: 0, weekend: 0, leave: 0, training: 0 },
  }));

  const dowAt = (i: number) => dowByIndex[i];
  const hasMorningAt = (i: number) => {
    const dow = dowAt(i);
    return dow <= 4 || holidayMorningDays.has(dow);
  };
  const onAnnualLeave = (e: Employee, i: number) => {
    const al = c(e).annualLeave;
    if (!al || !al.from || !al.to) return false;
    const d = dateByIndex[i];
    return d >= al.from && d <= al.to;
  };
  const onTraining = (e: Employee, i: number) => {
    const tr = c(e).training;
    if (!tr || !tr.from || !tr.to) return false;
    const d = dateByIndex[i];
    return d >= tr.from && d <= tr.to;
  };
  const unavailableOn = (e: Employee, i: number) => onAnnualLeave(e, i) || onTraining(e, i);

  // طابور المساء: من يمكنه المساء طوال فترة الـ5
  const eveningPool = emp.filter((e) => {
    const k = c(e);
    return !k.morningOnly && !k.official && !k.noWeekend;
  });

  // مرحلة أ: تبليط طابور المساء (يتخطّى المُجازين فلا تنشأ فجوات مفردة)
  const eveningOwner = new Array<string | null>(N).fill(null);
  let endState: ScheduleResult['endState'] = null;

  const availableForBlock = (e: Employee, blockStart: number, len: number) => {
    let present = 0, total = 0;
    for (let j = blockStart; j < Math.min(blockStart + len, N); j++) {
      total++;
      if (!unavailableOn(e, j)) present++;
    }
    return total > 0 && present >= Math.ceil(total / 2);
  };

  if (eveningPool.length) {
    let pool = eveningPool.slice();
    let queueStart = 0;
    let firstBlockDays = 5;

    if (carryOver && carryOver.ownerId && (carryOver.daysLeft | 0) > 0 && pool.some((e) => e.id === carryOver.ownerId)) {
      const ci = pool.findIndex((e) => e.id === carryOver.ownerId);
      pool = pool.slice(ci).concat(pool.slice(0, ci));
      firstBlockDays = Math.min(carryOver.daysLeft | 0, 5);
      queueStart = 0;
    } else {
      const fi = pool.findIndex((e) => e.id === firstEveningId);
      if (fi > 0) pool = pool.slice(fi).concat(pool.slice(0, fi));
    }

    const s0 = carryOver && (carryOver.daysLeft || 0) > 0 ? 0 : Math.max(0, Math.min(N - 1, (startDay | 0) - 1));

    // للأمام
    let turn = queueStart;
    let firstBlock = true;
    for (let blockStart = s0; blockStart < N; ) {
      const len = firstBlock ? firstBlockDays : 5;
      let picked: Employee | null = null;
      let tries = 0;
      while (tries < pool.length) {
        const cand = pool[turn % pool.length];
        turn++;
        if (availableForBlock(cand, blockStart, len)) { picked = cand; break; }
        tries++;
      }
      if (!picked) picked = pool[(turn - 1 + pool.length) % pool.length];
      for (let j = blockStart; j < Math.min(blockStart + len, N); j++) {
        if (!unavailableOn(picked, j)) eveningOwner[j] = picked.id;
      }
      blockStart += len;
      firstBlock = false;
    }

    // رجوعًا قبل s0
    if (s0 > 0) {
      let backTurn = queueStart - 1;
      for (let blockEnd = s0 - 1; blockEnd >= 0; blockEnd -= 5) {
        const bs = Math.max(0, blockEnd - 4);
        let picked: Employee | null = null;
        let tries = 0;
        while (tries < pool.length) {
          const idx = ((backTurn % pool.length) + pool.length) % pool.length;
          const cand = pool[idx];
          backTurn--;
          if (availableForBlock(cand, bs, blockEnd - bs + 1)) { picked = cand; break; }
          tries++;
        }
        if (!picked) {
          const idx = (((backTurn + 1) % pool.length) + pool.length) % pool.length;
          picked = pool[idx];
        }
        for (let j = blockEnd; j >= bs; j--) {
          if (!unavailableOn(picked, j)) eveningOwner[j] = picked.id;
        }
      }
    }

    const lastOwner = eveningOwner[N - 1];
    if (lastOwner != null) {
      let done = 0;
      for (let j = N - 1; j >= 0 && eveningOwner[j] === lastOwner; j--) done++;
      endState = { ownerId: lastOwner, daysDone: done, daysLeft: Math.max(0, 5 - done) };
    }
  }

  // مرحلة ب: بناء جدول كل موظف
  emp.forEach((e) => {
    const k = c(e);
    for (let i = 0; i < N; i++) {
      const dow = dowAt(i);

      // الإجازة/الدورة تغلبان كل شيء (لا عمل إطلاقًا)
      if (onAnnualLeave(e, i)) { e.days[i] = SHIFT.LEAVE; continue; }
      if (onTraining(e, i)) { e.days[i] = SHIFT.TRAINING; continue; }

      // فترة المساء المخصّصة
      if (eveningOwner[i] === e.id) { e.days[i] = SHIFT.EVENING; continue; }

      // عطلة نهاية الأسبوع (رسمي / لا نهاية أسبوع)
      if ((k.official || k.noWeekend) && (dow === 5 || dow === 6)) { e.days[i] = SHIFT.REST; continue; }

      // القيود الثابتة
      if (k.official || k.morningOnly) { e.days[i] = hasMorningAt(i) ? SHIFT.MORNING : SHIFT.REST; continue; }

      // مساء فقط: يرتاح خارج فترة مساءه
      if (k.eveningOnly) { e.days[i] = SHIFT.REST; continue; }

      // دورة مستمرة 5 عمل/2 إجازة تملأ الفجوات بين فترات المساء
      let lastEveningEnd = -999, nextEveningStart = 999999;
      for (let j = i - 1; j >= 0; j--) { if (eveningOwner[j] === e.id) { lastEveningEnd = j; break; } }
      for (let j = i + 1; j < N; j++) { if (eveningOwner[j] === e.id) { nextEveningStart = j; break; } }
      const gapBefore = nextEveningStart - i;
      let ph: ShiftKind;
      if (gapBefore <= 2) {
        ph = SHIFT.REST;
      } else if (lastEveningEnd < 0) {
        const toFirst = nextEveningStart < 999999 ? nextEveningStart - i : N - i;
        const posBack = (((toFirst - 3) % 7) + 7) % 7;
        ph = toFirst > 2 && posBack <= 4 ? SHIFT.MORNING : SHIFT.REST;
      } else {
        const gapAfter = i - lastEveningEnd;
        const pos = (gapAfter - 1) % 7;
        ph = pos < 2 ? SHIFT.REST : SHIFT.MORNING;
      }
      if (ph === SHIFT.MORNING && !hasMorningAt(i)) ph = SHIFT.REST;
      e.days[i] = ph;
    }
  });

  // مرحلة ج: تغطية فجوات المساء بفترات متصلة لبديل واحد
  const freeForEvening = (e: ScheduledEmployee, i: number) => {
    if (onAnnualLeave(e, i) || onTraining(e, i)) return false;
    const s = e.days[i];
    return s === SHIFT.REST || s === SHIFT.MORNING || s == null;
  };
  const eveningCountSoFar = (e: ScheduledEmployee) => e.days.filter((s) => s === SHIFT.EVENING).length;
  for (let i = 0; i < N; ) {
    if (emp.some((e) => e.days[i] === SHIFT.EVENING)) { i++; continue; }
    let gapEnd = i;
    while (gapEnd < N && !emp.some((e) => e.days[gapEnd] === SHIFT.EVENING)) gapEnd++;
    let d = i;
    while (d < gapEnd) {
      const len = Math.min(5, gapEnd - d);
      const cands = eveningPool
        .filter((e) => {
          for (let j = d; j < d + len; j++) if (!freeForEvening(e as ScheduledEmployee, j)) return false;
          let before = 0;
          for (let j = d - 1; j >= 0; j--) {
            const s = (e as ScheduledEmployee).days[j];
            if (s === SHIFT.MORNING || s === SHIFT.EVENING) before++; else break;
          }
          return before === 0;
        })
        .sort((a, b) => eveningCountSoFar(a as ScheduledEmployee) - eveningCountSoFar(b as ScheduledEmployee));
      const pick =
        (cands[0] as ScheduledEmployee) ||
        (eveningPool
          .filter((e) => {
            for (let j = d; j < d + len; j++) if (!freeForEvening(e as ScheduledEmployee, j)) return false;
            return true;
          })
          .sort((a, b) => eveningCountSoFar(a as ScheduledEmployee) - eveningCountSoFar(b as ScheduledEmployee))[0] as ScheduledEmployee);
      if (pick) {
        for (let j = d; j < d + len; j++) pick.days[j] = SHIFT.EVENING;
        for (let j = d + len; j < Math.min(d + len + 2, N); j++) if (pick.days[j] === SHIFT.MORNING) pick.days[j] = SHIFT.REST;
      }
      d += len;
    }
    i = gapEnd;
  }

  // مرحلة د: حماية حد الـ5 لأيام الصباح
  emp.forEach((e) => {
    let run = 0;
    for (let i = 0; i < N; i++) {
      const s = e.days[i];
      if (s === SHIFT.MORNING || s === SHIFT.EVENING) {
        run++;
        if (run > 5 && s === SHIFT.MORNING) { e.days[i] = SHIFT.REST; run = 0; }
      } else run = 0;
    }
  });

  // الإحصائيات
  emp.forEach((e) => {
    e.stats = { morning: 0, evening: 0, rest: 0, xrest: 0, fri: 0, sat: 0, work: 0, weekend: 0, leave: 0, training: 0 };
    e.days.forEach((s, d) => {
      const dow = dowAt(d);
      if (s === SHIFT.MORNING) { e.stats.morning++; e.stats.work++; }
      if (s === SHIFT.EVENING) { e.stats.evening++; e.stats.work++; }
      if (s === SHIFT.REST) e.stats.rest++;
      if (s === SHIFT.XREST) e.stats.xrest++;
      if (s === SHIFT.LEAVE) e.stats.leave++;
      if (s === SHIFT.TRAINING) e.stats.training++;
      if (s === SHIFT.MORNING || s === SHIFT.EVENING) {
        if (dow === 5) { e.stats.fri++; e.stats.weekend++; }
        if (dow === 6) { e.stats.sat++; e.stats.weekend++; }
      }
    });
  });

  return { emp, N, year, month, dowByIndex, dateByIndex, endState };
}

export function fairnessScore(emp: ScheduledEmployee[]): number {
  if (!emp.length) return 100;
  const vals = emp.map((e) => e.stats.work);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return 100;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.round((1 - cv) * 100));
}

export function validate(sched: ScheduleResult | null, holidayMorningDays: Set<number>): Issue[] {
  if (!sched) return [];
  const { emp, dowByIndex, N } = sched;
  const issues: Issue[] = [];
  const seen = new Set<string>();
  const push = (o: Issue) => {
    const key = o.emp + o.msg;
    if (!seen.has(key)) { seen.add(key); issues.push(o); }
  };

  emp.forEach((e) => {
    const k = e.constraints || {};
    let run = 0;
    e.days.forEach((s) => {
      if (s === SHIFT.MORNING || s === SHIFT.EVENING) {
        run++;
        if (run > 5) push({ type: 'bad', emp: e.name, msg: 'تجاوز ٥ أيام عمل متتالية' });
      } else run = 0;
    });
    e.days.forEach((s, d) => {
      const dow = dowByIndex[d];
      if (s === SHIFT.EVENING && (k.morningOnly || k.official)) push({ type: 'bad', emp: e.name, msg: 'أُسندت مناوبة مسائية رغم منعها' });
      if (s === SHIFT.MORNING && k.eveningOnly) push({ type: 'bad', emp: e.name, msg: 'أُسندت مناوبة صباحية رغم منعها' });
      if ((s === SHIFT.MORNING || s === SHIFT.EVENING) && (dow === 5 || dow === 6) && (k.official || k.noWeekend))
        push({ type: 'bad', emp: e.name, msg: 'أُسند عمل في نهاية الأسبوع رغم منعه' });
      if (s === SHIFT.MORNING && (dow === 5 || dow === 6) && !holidayMorningDays.has(dow))
        push({ type: 'bad', emp: e.name, msg: `مناوبة صباحية يوم ${dow === 5 ? 'الجمعة' : 'السبت'}` });
    });
  });

  for (let d = 0; d < N; d++) {
    const cnt = emp.filter((e) => e.days[d] === SHIFT.EVENING).length;
    if (cnt > 1) push({ type: 'bad', emp: 'المساء', msg: `اليوم ${d + 1}: أكثر من موظف مسائي (${cnt})` });
    if (cnt === 0) push({ type: 'warn', emp: 'المساء', msg: `اليوم ${d + 1}: لا يوجد موظف مسائي` });
  }

  if (emp.length) {
    const works = emp.map((e) => e.stats.work);
    const max = Math.max(...works), min = Math.min(...works);
    if (max - min >= 6) {
      const top = emp.find((e) => e.stats.work === max);
      push({ type: 'warn', emp: top?.name || '', msg: `فارق كبير في أيام العمل (${min}–${max})` });
    }
  }
  return issues;
}
