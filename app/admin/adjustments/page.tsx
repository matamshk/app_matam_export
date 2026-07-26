import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { hijriMonthsNames } from "@/lib/hijri";

export default async function AdminAdjustmentsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Fetch months list for the current year (1448)
  const months = await prisma.month.findMany({
    where: { yearId: 1448 },
    orderBy: { monthNumber: "asc" }
  });

  // Action to update month Hijri adjustment start date offset
  async function updateAdjustment(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const adjustmentDays = parseInt(formData.get("adjustmentDays") as string, 10);
    const monthName = formData.get("monthName") as string;

    await prisma.month.update({
      where: { id },
      data: { adjustmentDays }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        username: session?.username || "admin",
        action: `ضبط بداية شهر هجري: ${monthName}`,
        newValue: `تعديل القيمة إلى: ${adjustmentDays} أيام`
      }
    });

    redirect("/admin/adjustments");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">ضبط بداية الشهر الهجري (تعديل الأيام)</h2>
          <p className="text-sm text-text-secondary mt-1">تأخير أو تقديم بداية الأشهر الهجرية حسب الرؤية الشرعية دون تغيير أوقات الصلاة</p>
        </div>
        <Link href="/admin" className="bg-white border border-border-custom px-4 py-2 rounded-lg text-sm hover:bg-emerald-light/5 transition">
          عودة للوحة
        </Link>
      </div>

      <div className="bg-white border border-border-custom rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-emerald-primary text-white p-4">
          <h3 className="font-bold">أشهر سنة 1448 هـ الحالية وتعديلات الأيام</h3>
        </div>
        <div className="p-4 space-y-4">
          {months.map((m: any) => (
            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-4 last:border-0 last:pb-0 gap-4">
              <div>
                <h4 className="font-bold text-text-primary text-lg">شهر {m.monthNameAr} ({m.monthNumber})</h4>
                <p className="text-xs text-text-secondary mt-1">مقدار التعديل الحالي: {m.adjustmentDays} أيام</p>
              </div>

              <form action={updateAdjustment} className="flex items-center gap-3">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="monthName" value={m.monthNameAr} />
                
                <select 
                  name="adjustmentDays"
                  defaultValue={m.adjustmentDays}
                  className="bg-emerald-light/5 border border-border-custom px-3 py-2 rounded-lg text-sm"
                >
                  <option value="-2">تأخير يومين (-2)</option>
                  <option value="-1">تأخير يوم واحد (-1)</option>
                  <option value="0">بدون تعديل (0)</option>
                  <option value="1">تقديم يوم واحد (+1)</option>
                  <option value="2">تقديم يومين (+2)</option>
                </select>

                <button 
                  type="submit" 
                  className="bg-emerald-primary hover:bg-emerald-primary/95 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
                >
                  تحديث
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
