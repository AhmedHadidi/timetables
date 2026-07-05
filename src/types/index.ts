// أنواع النظام

export type ShiftKind =
  | 'morning'
  | 'evening'
  | 'rest'
  | 'xrest'
  | 'holiday'
  | 'leave'
  | 'training';

export interface DateRange {
  from?: string; // 'YYYY-MM-DD'
  to?: string;
}

export interface Constraints {
  morningOnly?: boolean;
  eveningOnly?: boolean;
  noWeekend?: boolean;
  official?: boolean;
  annualLeave?: DateRange;
  training?: DateRange;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  active: boolean;
  constraints: Constraints;
  prefers?: 'morning' | 'evening' | null;
}

export interface EmployeeStats {
  morning: number;
  evening: number;
  rest: number;
  xrest: number;
  fri: number;
  sat: number;
  work: number;
  weekend: number;
  leave: number;
  training: number;
}

export interface ScheduledEmployee extends Employee {
  days: (ShiftKind | null)[];
  stats: EmployeeStats;
}

export interface CarryOver {
  ownerId: string;
  daysLeft: number;
}

export interface EndState extends CarryOver {
  daysDone: number;
}

export interface ScheduleConfig {
  year: number;
  month: number; // 1..12
  morningStaff?: number;
  eveningStaff?: number;
  holidayMorningDays?: Set<number>;
  startDay?: number;
  firstEveningId?: string | null;
  carryOver?: CarryOver | null;
}

export interface ScheduleResult {
  emp: ScheduledEmployee[];
  N: number;
  year: number;
  month: number;
  dowByIndex: number[];
  dateByIndex: string[];
  endState: EndState | null;
}

export interface Issue {
  type: 'bad' | 'warn';
  emp: string;
  msg: string;
}
