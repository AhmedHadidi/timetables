-- ============================================================
-- مخطط قاعدة بيانات نظام المناوبات — Supabase (PostgreSQL)
-- شغّل هذا الملف في: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- جدول الموظفين
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text default '',
  active      boolean not null default true,
  constraints jsonb not null default '{}'::jsonb,
  prefers     text,                       -- 'morning' | 'evening' | null
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- جدول إعدادات النظام (صف واحد لكل مستخدم/مؤسسة — هنا مبسّط بصف عام)
create table if not exists public.settings (
  id                uuid primary key default gen_random_uuid(),
  singleton         boolean not null default true unique,   -- لضمان صف واحد
  morning_staff     int not null default 2,
  evening_staff     int not null default 1,
  holiday_mornings  int[] not null default '{}',
  updated_at        timestamptz not null default now()
);

-- الجداول الشهرية المحفوظة
create table if not exists public.schedules (
  id           uuid primary key default gen_random_uuid(),
  year         int not null,
  month        int not null,              -- 1..12
  data         jsonb not null,            -- نتيجة الجدول الكاملة (emp + days + stats)
  carry_next   jsonb,                     -- حالة الاستمرارية للشهر التالي {ownerId, daysLeft}
  start_day    int not null default 1,
  first_evening_id uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (year, month)
);

-- حالات الاستمرارية بين الأشهر (اختياري: مخزّنة أيضًا داخل schedules.carry_next)
create table if not exists public.carryovers (
  id         uuid primary key default gen_random_uuid(),
  year       int not null,
  month      int not null,               -- الشهر الذي يرث هذه الحالة
  owner_id   uuid,
  days_left  int not null default 0,
  unique (year, month)
);

-- تحديث updated_at تلقائيًا
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_employees_touch on public.employees;
create trigger trg_employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_schedules_touch on public.schedules;
create trigger trg_schedules_touch before update on public.schedules
  for each row execute function public.touch_updated_at();

-- ============================================================
-- أمان مستوى الصف (RLS)
--   القراءة: متاحة للجميع (عرض عام بلا تسجيل دخول)
--   الكتابة/التعديل/الحذف: للمستخدمين المصادَقين فقط (المدير)
-- ============================================================
alter table public.employees  enable row level security;
alter table public.settings   enable row level security;
alter table public.schedules  enable row level security;
alter table public.carryovers enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['employees','settings','schedules','carryovers'] loop
    -- قراءة عامة (anon + authenticated)
    execute format('drop policy if exists public_read_%1$s on public.%1$s', t);
    execute format('create policy public_read_%1$s on public.%1$s for select using (true)', t);

    -- كتابة/تحديث/حذف للمصادَقين فقط
    execute format('drop policy if exists auth_insert_%1$s on public.%1$s', t);
    execute format('create policy auth_insert_%1$s on public.%1$s for insert to authenticated with check (true)', t);

    execute format('drop policy if exists auth_update_%1$s on public.%1$s', t);
    execute format('create policy auth_update_%1$s on public.%1$s for update to authenticated using (true) with check (true)', t);

    execute format('drop policy if exists auth_delete_%1$s on public.%1$s', t);
    execute format('create policy auth_delete_%1$s on public.%1$s for delete to authenticated using (true)', t);
  end loop;
end $$;

-- صف الإعدادات الافتراضي
insert into public.settings (singleton, morning_staff, evening_staff, holiday_mornings)
values (true, 2, 1, '{}')
on conflict (singleton) do nothing;

-- بيانات موظفين أولية (اختياري — احذفها إن أردت البدء فارغًا)
insert into public.employees (name, role, active, constraints) values
  ('أحمد الحديدي', '', true, '{}'::jsonb),
  ('سالم الحوسني', '', true, '{}'::jsonb),
  ('شاذان الرمحي', '', true, '{}'::jsonb),
  ('عون آل صالح',  '', true, '{}'::jsonb),
  ('فهد المغيري',  '', true, '{}'::jsonb),
  ('هشام الجهوري', '', true, '{}'::jsonb)
on conflict do nothing;
