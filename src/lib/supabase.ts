import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // رسالة واضحة أثناء التطوير إذا لم تُضبط المتغيرات
  console.warn('⚠️ متغيرات Supabase غير مضبوطة. أنشئ ملف .env من .env.example');
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'anon');
