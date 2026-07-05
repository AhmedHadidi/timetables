import { supabase } from './supabase';
import type { Employee, CarryOver, ScheduleResult } from '../types';

/* ============ الموظفون ============ */
export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    role: r.role || '',
    active: r.active,
    constraints: r.constraints || {},
    prefers: r.prefers ?? null,
  }));
}

export async function upsertEmployee(e: Employee): Promise<Employee> {
  const row = {
    id: e.id,
    name: e.name,
    role: e.role || '',
    active: e.active,
    constraints: e.constraints || {},
    prefers: e.prefers ?? null,
  };
  const { data, error } = await supabase.from('employees').upsert(row).select().single();
  if (error) throw error;
  return {
    id: data.id, name: data.name, role: data.role || '', active: data.active,
    constraints: data.constraints || {}, prefers: data.prefers ?? null,
  };
}

export async function insertEmployee(e: Omit<Employee, 'id'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: e.name, role: e.role || '', active: e.active,
      constraints: e.constraints || {}, prefers: e.prefers ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id, name: data.name, role: data.role || '', active: data.active,
    constraints: data.constraints || {}, prefers: data.prefers ?? null,
  };
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

/* ============ الإعدادات ============ */
export interface Settings {
  morningStaff: number;
  eveningStaff: number;
  holidayMornings: number[];
}
export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('singleton', true).single();
  if (error) throw error;
  return {
    morningStaff: data.morning_staff,
    eveningStaff: data.evening_staff,
    holidayMornings: data.holiday_mornings || [],
  };
}
export async function saveSettings(s: Settings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ morning_staff: s.morningStaff, evening_staff: s.eveningStaff, holiday_mornings: s.holidayMornings })
    .eq('singleton', true);
  if (error) throw error;
}

/* ============ الجداول المحفوظة ============ */
export async function saveSchedule(
  year: number, month: number, result: ScheduleResult, startDay: number, firstEveningId: string | null,
): Promise<void> {
  const { error } = await supabase.from('schedules').upsert(
    {
      year, month,
      data: result as any,
      carry_next: result.endState && result.endState.daysLeft > 0
        ? { ownerId: result.endState.ownerId, daysLeft: result.endState.daysLeft }
        : null,
      start_day: startDay,
      first_evening_id: firstEveningId,
    },
    { onConflict: 'year,month' },
  );
  if (error) throw error;

  // خزّن الاستمرارية للشهر التالي
  const nk = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  if (result.endState && result.endState.daysLeft > 0) {
    await supabase.from('carryovers').upsert(
      { year: nk.y, month: nk.m, owner_id: result.endState.ownerId, days_left: result.endState.daysLeft },
      { onConflict: 'year,month' },
    );
  } else {
    await supabase.from('carryovers').delete().eq('year', nk.y).eq('month', nk.m);
  }
}

export async function fetchSchedule(year: number, month: number): Promise<ScheduleResult | null> {
  const { data, error } = await supabase
    .from('schedules').select('data').eq('year', year).eq('month', month).maybeSingle();
  if (error) throw error;
  return data ? (data.data as ScheduleResult) : null;
}

export async function fetchCarryOver(year: number, month: number): Promise<CarryOver | null> {
  const { data, error } = await supabase
    .from('carryovers').select('owner_id, days_left').eq('year', year).eq('month', month).maybeSingle();
  if (error) throw error;
  return data ? { ownerId: data.owner_id, daysLeft: data.days_left } : null;
}
