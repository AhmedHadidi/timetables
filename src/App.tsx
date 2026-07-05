import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './lib/useAuth';
import { isAdmin } from './lib/config';
import Login from './pages/Login';
import { generateSchedule, fairnessScore, validate } from './lib/engine';
import * as api from './lib/api';
import type { Employee, ScheduleResult, ScheduleConfig } from './types';
import TopBar from './components/TopBar';
import ScheduleView from './components/ScheduleView';
import EmployeesView from './components/EmployeesView';
import StatsView from './components/StatsView';
import Flash from './components/Flash';

export interface AppConfig {
  year: number;
  month: number;
  startDay: number;
  firstEveningId: string | null;
}

export default function App() {
  const { session, loading, signOut } = useAuth();
  const now = new Date();

  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState<'schedule' | 'employees' | 'stats'>('schedule');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidayMornings, setHolidayMornings] = useState<Set<number>>(new Set());
  const [config, setConfig] = useState<AppConfig>({
    year: now.getFullYear(), month: now.getMonth() + 1, startDay: 1, firstEveningId: null,
  });
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [flash, setFlash] = useState<{ type: 'good' | 'warn' | 'bad'; msg: string } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // صلاحية التعديل حصريًا للمدير الوحيد
  const canEdit = isAdmin(session?.user?.email);

  const showFlash = (type: 'good' | 'warn' | 'bad', msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 2600);
  };

  // تحميل البيانات للجميع (عرض عام) — لا يتطلب تسجيل دخول
  useEffect(() => {
    (async () => {
      setDataLoading(true);
      try {
        const [emps, settings] = await Promise.all([api.fetchEmployees(), api.fetchSettings()]);
        setEmployees(emps);
        setHolidayMornings(new Set(settings.holidayMornings));
      } catch (e) {
        console.error(e);
        showFlash('bad', 'تعذّر تحميل البيانات — تحقق من إعداد Supabase');
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  // بعد تسجيل الدخول بنجاح، أغلق صفحة الدخول
  useEffect(() => { if (session) setShowLogin(false); }, [session]);

  // توليد الجدول (المدير) أو عرض المحفوظ (الزائر)
  const build = useCallback(async () => {
    if (!canEdit) return; // حماية: الزائر لا يولّد
    try {
      const carry = await api.fetchCarryOver(config.year, config.month);
      const cfg: ScheduleConfig = {
        year: config.year, month: config.month,
        holidayMorningDays: holidayMornings,
        startDay: config.startDay,
        firstEveningId: config.firstEveningId,
        carryOver: carry,
      };
      const res = generateSchedule(employees, cfg);
      setSchedule(res);
      await api.saveSchedule(config.year, config.month, res, config.startDay, config.firstEveningId);
      showFlash('good', 'تم إنشاء الجدول وحفظه في قاعدة البيانات');
    } catch (e) {
      console.error(e);
      showFlash('bad', 'تعذّر إنشاء/حفظ الجدول');
    }
  }, [employees, holidayMornings, config, canEdit]);

  // تحميل الجدول المحفوظ للشهر المختار (للزائر والمدير معًا)
  const loadSaved = useCallback(async () => {
    try {
      const saved = await api.fetchSchedule(config.year, config.month);
      if (saved) {
        setSchedule(saved);
      } else if (canEdit && employees.length) {
        // لا يوجد جدول محفوظ — المدير يولّده مباشرة
        build();
      } else {
        setSchedule(null);
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.year, config.month, canEdit, employees.length]);

  // عند تغيّر الشهر أو اكتمال التحميل، اعرض الجدول المحفوظ
  useEffect(() => {
    if (!dataLoading) loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading, config.year, config.month]);

  if (loading) return <Centered>...جارٍ التحميل</Centered>;

  // صفحة تسجيل الدخول تُعرض فقط عند طلبها صراحةً
  if (showLogin && !session) return <Login onBack={() => setShowLogin(false)} />;

  const fair = schedule ? fairnessScore(schedule.emp) : 100;
  const issues = schedule ? validate(schedule, holidayMornings) : [];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        tab={tab} setTab={setTab}
        canEdit={canEdit}
        onBuild={build}
        onSignOut={signOut}
        onLogin={() => setShowLogin(true)}
        email={session?.user?.email || ''}
      />
      {flash && <Flash flash={flash} />}
      {!canEdit && (
        <div style={{ background: 'var(--evening-bg)', color: 'var(--evening-line)', textAlign: 'center', padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>
          👁️ وضع العرض فقط — للتعديل يلزم تسجيل دخول الإدارة
        </div>
      )}
      <main style={{ flex: 1, padding: '0 clamp(12px,3vw,32px) 40px' }}>
        {dataLoading ? (
          <Centered>...جارٍ تحميل بيانات الموظفين</Centered>
        ) : (
          <>
            {tab === 'schedule' && (
              <ScheduleView
                schedule={schedule} setSchedule={setSchedule}
                fair={fair} issues={issues}
                config={config} setConfig={setConfig}
                holidayMornings={holidayMornings} setHolidayMornings={setHolidayMornings}
                employees={employees} onBuild={build}
                readOnly={!canEdit}
                onSaveSettings={async (hm) => { if (canEdit) await api.saveSettings({ morningStaff: 2, eveningStaff: 1, holidayMornings: [...hm] }); }}
                showFlash={showFlash}
              />
            )}
            {tab === 'employees' && (
              <EmployeesView
                employees={employees} setEmployees={setEmployees} schedule={schedule}
                readOnly={!canEdit}
                showFlash={showFlash}
              />
            )}
            {tab === 'stats' && <StatsView schedule={schedule} fair={fair} />}
          </>
        )}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 16, fontWeight: 600 }}>
      {children}
    </div>
  );
}
