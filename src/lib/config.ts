// ============================================================
// إعداد المدير الوحيد
// البريد الوحيد المصرَّح له بالتعديل والإدارة. أي حساب آخر — حتى لو
// سجّل الدخول — يبقى في وضع العرض فقط.
// أنشئ هذا الحساب مرة واحدة في Supabase (Authentication → Add user)،
// والتسجيل من داخل التطبيق مقفل نهائيًا.
// ============================================================
export const ADMIN_EMAIL = ['seebawy19@gmail.com', 'ahmed@test.com',];

// هل هذا المستخدم هو المدير المصرَّح له؟
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
