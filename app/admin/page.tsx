import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Fetch stats
  const yearsCount = await prisma.year.count();
  const daysCount = await prisma.day.count();
  const occasionsCount = await prisma.event.count();
  const logsCount = await prisma.auditLog.count();
  
  const latestLogs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 5
  });

  async function logout() {
    "use server";
    const { cookies } = await import("next/headers");
    (await cookies()).delete("admin_token");
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">لوحة إدارة التقويم والمواقيت</h2>
          <p className="text-sm text-text-secondary mt-1">مرحباً بك، {session.name} ({session.role})</p>
        </div>
        <form action={logout} className="inline">
          <button 
            type="submit" 
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm transition font-semibold"
          >
            تسجيل الخروج
          </button>
        </form>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-sm text-center">
          <span className="text-xs text-text-secondary font-medium">السنوات المسجلة</span>
          <h3 className="text-3xl font-extrabold text-emerald-primary mt-2">{yearsCount}</h3>
        </div>
        <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-sm text-center">
          <span className="text-xs text-text-secondary font-medium">أيام التقويم الموثقة</span>
          <h3 className="text-3xl font-extrabold text-emerald-primary mt-2">{daysCount}</h3>
        </div>
        <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-sm text-center">
          <span className="text-xs text-text-secondary font-medium">المناسبات الدينية</span>
          <h3 className="text-3xl font-extrabold text-emerald-primary mt-2">{occasionsCount}</h3>
        </div>
        <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-sm text-center">
          <span className="text-xs text-text-secondary font-medium">سجلات التعديل والتدقيق</span>
          <h3 className="text-3xl font-extrabold text-emerald-primary mt-2">{logsCount}</h3>
        </div>
      </div>

      {/* Navigation actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/admin/adjustments" className="bg-white hover:bg-emerald-light/10 border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center group transition">
          <span className="text-3xl mb-3">📅</span>
          <h4 className="font-bold text-text-primary group-hover:text-emerald-primary transition">ضبط الشهور الهجرية والأوقات</h4>
          <p className="text-xs text-text-secondary mt-1">زيادة/نقصان أيام الشهر الهجري وتعديل أوقات الصلاة</p>
        </Link>

        <Link href="/admin/occasions" className="bg-white hover:bg-emerald-light/10 border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center group transition">
          <span className="text-3xl mb-3">🌟</span>
          <h4 className="font-bold text-text-primary group-hover:text-emerald-primary transition">إدارة المناسبات المركزية</h4>
          <p className="text-xs text-text-secondary mt-1">إضافة وتعديل وحذف المناسبات الدينية وتفعيل ظهورها</p>
        </Link>

        <Link href="/admin/settings" className="bg-white hover:bg-emerald-light/10 border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center group transition">
          <span className="text-3xl mb-3">⚙️</span>
          <h4 className="font-bold text-text-primary group-hover:text-emerald-primary transition">إعدادات الموقع والتواصل</h4>
          <p className="text-xs text-text-secondary mt-1">تحديث هاتف الواتس أب وقنوات التواصل والطباعة</p>
        </Link>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-border-custom rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-emerald-primary text-white p-4">
          <h3 className="font-bold">سجلات التعديل الأخيرة (Audit Log)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-light/10 text-emerald-dark font-bold border-b border-border-custom">
                <th className="p-3 border-l border-border-custom">المستخدم</th>
                <th className="p-3 border-l border-border-custom">العملية</th>
                <th className="p-3 border-l border-border-custom">الوقت والتاريخ</th>
                <th className="p-3">تفاصيل التعديل</th>
              </tr>
            </thead>
            <tbody>
              {latestLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-border-custom hover:bg-emerald-light/5 transition">
                  <td className="p-3 border-l border-border-custom font-semibold">{log.username}</td>
                  <td className="p-3 border-l border-border-custom text-emerald-primary font-bold">{log.action}</td>
                  <td className="p-3 border-l border-border-custom font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3 text-text-secondary text-xs">
                    {log.newValue ? `تعديل إلى: ${log.newValue}` : "عملية حذف أو تعديل عام"}
                  </td>
                </tr>
              ))}
              {latestLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-secondary">لا توجد سجلات تعديل حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
