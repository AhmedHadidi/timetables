// ============================================================
// إعداد المديرين المصرَّح لهم
// أي بريد في هذه القائمة له كامل الصلاحيات (تعديل/إضافة/توليد).
// أي حساب آخر — حتى لو سجّل الدخول بنجاح — يبقى في وضع العرض فقط.
// ============================================================
export const ADMIN_EMAILS: string[] = ['seebawy19@gmail.com', 'ahmed@test.com'];

// هل هذا المستخدم من ضمن المديرين المصرَّح لهم؟
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a.trim().toLowerCase() === normalized);
}
