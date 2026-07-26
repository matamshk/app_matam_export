import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { hijriMonthsNames } from "@/lib/hijri";

export default async function AdminOccasionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  // Fetch central events
  const occasions = await prisma.event.findMany({
    orderBy: [
      { hijriMonth: "asc" },
      { hijriDay: "asc" }
    ]
  });

  // Action to add occasion
  async function addOccasion(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const hijriMonth = parseInt(formData.get("hijriMonth") as string, 10);
    const hijriDay = parseInt(formData.get("hijriDay") as string, 10);
    const eventType = formData.get("eventType") as string;

    const slug = `custom-event-${hijriMonth}-${hijriDay}-${Date.now()}`;

    await prisma.event.create({
      data: {
        title,
        slug,
        hijriMonth,
        hijriDay,
        eventType,
        description: title,
        displayInCalendar: true,
        priority: 1
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        username: session?.username || "admin",
        action: "إضافة مناسبة جديدة",
        newValue: `${title} (${hijriDay} / ${hijriMonth})`
      }
    });

    redirect("/admin/occasions");
  }

  // Action to delete occasion
  async function deleteOccasion(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;

    await prisma.event.delete({
      where: { id }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        username: session?.username || "admin",
        action: "حذف مناسبة",
        newValue: title
      }
    });

    redirect("/admin/occasions");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">إدارة المناسبات الدينية المركزية</h2>
          <p className="text-sm text-text-secondary mt-1">تحديد وحفظ الفعاليات والمناسبات التي تظهر تلقائياً في التقويم السنوي</p>
        </div>
        <Link href="/admin" className="bg-white border border-border-custom px-4 py-2 rounded-lg text-sm hover:bg-emerald-light/5 transition">
          عودة للوحة
        </Link>
      </div>

      {/* Add Occasion Section */}
      <div className="bg-white border border-border-custom rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="font-bold text-text-primary mb-4 border-b border-border-custom pb-2">➕ إضافة مناسبة دينية جديدة</h3>
        <form action={addOccasion} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-primary mb-2">اسم المناسبة</label>
            <input 
              type="text" 
              name="title"
              placeholder="مثال: وفاة الإمام علي بن أبي طالب (ع)"
              className="w-full bg-emerald-light/5 border border-border-custom px-3 py-2 rounded-lg text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-2">اليوم الهجري</label>
            <input 
              type="number" 
              name="hijriDay"
              min={1}
              max={30}
              defaultValue={1}
              className="w-full bg-emerald-light/5 border border-border-custom px-3 py-2 rounded-lg text-sm"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-2">الشهر الهجري</label>
            <select 
              name="hijriMonth"
              className="w-full bg-emerald-light/5 border border-border-custom px-3 py-2 rounded-lg text-sm"
              required
            >
              {hijriMonthsNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-2">نوع المناسبة</label>
            <select 
              name="eventType"
              className="w-full bg-emerald-light/5 border border-border-custom px-3 py-2 rounded-lg text-sm"
              required
            >
              <option value="GENERAL">عامة</option>
              <option value="BIRTH">ولادة / ميلاد</option>
              <option value="DEATH">وفاة / رحيل</option>
              <option value="MARTYRDOM">شهادة / استشهاد</option>
            </select>
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button 
              type="submit" 
              className="bg-emerald-primary hover:bg-emerald-primary/95 text-white font-bold px-6 py-2 rounded-lg text-sm transition"
            >
              حفظ وإضافة المناسبة
            </button>
          </div>
        </form>
      </div>

      {/* Occasions List */}
      <div className="bg-white border border-border-custom rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-emerald-primary text-white p-4">
          <h3 className="font-bold">المناسبات الدينية المسجلة ({occasions.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-light/10 text-emerald-dark font-bold border-b border-border-custom">
                <th className="p-3 border-l border-border-custom">التاريخ الهجري</th>
                <th className="p-3 border-l border-border-custom">المناسبة</th>
                <th className="p-3 border-l border-border-custom">النوع</th>
                <th className="p-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {occasions.map((occ: any) => {
                const isSad = occ.eventType === 'MARTYRDOM' || occ.eventType === 'DEATH';
                const isHappy = occ.eventType === 'BIRTH';
                
                return (
                  <tr key={occ.id} className="border-b border-border-custom hover:bg-emerald-light/5 transition">
                    <td className="p-3 border-l border-border-custom font-semibold">
                      {occ.hijriDay} {hijriMonthsNames[occ.hijriMonth - 1]}
                    </td>
                    <td className="p-3 border-l border-border-custom font-bold">{occ.title}</td>
                    <td className="p-3 border-l border-border-custom">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isSad ? 'bg-red-50 text-red-600' : isHappy ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                        {occ.eventType === 'BIRTH' ? 'ولادة' : isSad ? 'وفاة/شهادة' : 'عامة'}
                      </span>
                    </td>
                    <td className="p-3">
                      <form action={deleteOccasion}>
                        <input type="hidden" name="id" value={occ.id} />
                        <input type="hidden" name="title" value={occ.title} />
                        <button 
                          type="submit" 
                          className="text-red-500 hover:text-red-700 font-semibold text-xs"
                          onClick={(e) => { if(!confirm("هل أنت متأكد من حذف هذه المناسبة؟")) e.preventDefault(); }}
                        >
                          حذف نهائي
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
