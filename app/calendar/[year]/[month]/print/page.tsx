import React from "react";
import { prisma } from "@/lib/prisma";
import { hijriMonthsNames, gregMonthsNamesAr } from "@/lib/hijri";
import { notFound } from "next/navigation";

interface PrintPageProps {
  params: Promise<{
    year: string;
    month: string;
  }>;
}

export default async function MonthlyPrintPage({ params }: PrintPageProps) {
  const { year, month } = await params;
  const hijriYear = parseInt(year, 10);
  const monthNum = parseInt(month, 10);

  if (isNaN(hijriYear) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    notFound();
  }

  // Fetch month data with days
  const monthData = await prisma.month.findUnique({
    where: {
      yearId_monthNumber: {
        yearId: hijriYear,
        monthNumber: monthNum
      }
    },
    include: {
      days: {
        orderBy: { gregorianDate: "asc" }
      }
    }
  });

  if (!monthData) {
    notFound();
  }

  // Fetch occasions for this month to display in print table
  const occasions = await prisma.event.findMany({
    where: {
      hijriMonth: monthNum,
      isPublished: true,
      displayInCalendar: true
    }
  });

  // Calculate Greg month range for header
  let baseMonthIdx: number | null = null;
  let lastSeenMonth: number | null = null;

  if (monthData.days.length > 0) {
    const parts = monthData.days[0].gregorianDate.split("-");
    baseMonthIdx = parseInt(parts[1], 10) - 1;
  }

  return (
    <div className="bg-white text-black p-4 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-sans" style={{ direction: "rtl" }}>
      <div>
        {/* Print Header */}
        <div className="flex justify-between items-center pb-2">
          {/* Right Column: Text Info */}
          <div className="text-right w-[70%]">
            <h1 className="margin-0 text-3xl font-extrabold text-emerald-primary">مأتم أبو صيبع الشرقي</h1>
            <h2 className="margin-0 text-xl font-bold text-black mt-1">
              تقويم شهر {hijriMonthsNames[monthNum - 1]} {hijriYear}هـ
            </h2>
            <div className="text-xs text-gray-500 mt-1 font-semibold">تقويم هجري رسمي - مملكة البحرين</div>
          </div>
          {/* Left Column: Circular Green Logo */}
          <div className="w-[30%] flex justify-end items-center">
            <div className="w-16 h-16 bg-emerald-primary rounded-full flex justify-center items-center shadow-sm">
              <img src="/branding/logo-primary.png" alt="شعار المأتم" className="h-10 filter brightness-0 invert object-contain" />
            </div>
          </div>
        </div>

        {/* Brown/Gold Divider Line */}
        <div className="h-1 bg-gold-primary my-2 w-full"></div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-center text-xs leading-normal">
          <thead>
            <tr className="bg-gray-100 border-b border-black font-bold">
              <th className="border border-black p-1.5 w-10">الزواج</th>
              <th className="border border-black p-1.5 w-16">اليوم</th>
              <th className="border border-black p-1.5 w-12">{hijriMonthsNames[monthNum - 1].split(' ')[0]}</th>
              <th className="border border-black p-1.5 w-24">
                {baseMonthIdx !== null ? gregMonthsNamesAr[baseMonthIdx].split(' ')[0] : "الميلادي"}
              </th>
              <th className="border border-black p-1.5 w-12">فجر</th>
              <th className="border border-black p-1.5 w-12">شروق</th>
              <th className="border border-black p-1.5 w-12">ظهر</th>
              <th className="border border-black p-1.5 w-12">مغرب</th>
              <th className="border border-black p-1.5 text-right pr-3">المناسبات الدينية والوطنية</th>
            </tr>
          </thead>
          <tbody>
            {monthData.days.map((day: any) => {
              const parts = day.gregorianDate.split("-");
              const currentMonthIdx = parseInt(parts[1], 10) - 1;
              const dayNum = parseInt(parts[2], 10);
              
              let gregCellText = "";
              if (lastSeenMonth !== null && lastSeenMonth !== currentMonthIdx) {
                const mShortName = gregMonthsNamesAr[currentMonthIdx].split(" ")[0];
                gregCellText = `1${mShortName}`;
              } else {
                gregCellText = dayNum.toString();
              }
              lastSeenMonth = currentMonthIdx;

              const adjustedDay = day.hijriDay; 
              const dayOccasion = occasions.find((o: any) => o.hijriDay === adjustedDay);

              return (
                <tr key={day.id} className="border-b border-black h-5">
                  <td className="border border-black p-0.5 font-bold text-sm">{day.marriageCode || ""}</td>
                  <td className="border border-black p-0.5">{day.dayNameAr}</td>
                  <td className="border border-black p-0.5 font-mono text-sm">{day.hijriDay}</td>
                  <td className="border border-black p-0.5 font-bold">{gregCellText}</td>
                  <td className="border border-black p-0.5 font-mono text-sm">{day.fajr}</td>
                  <td className="border border-black p-0.5 font-mono text-sm">{day.sunrise}</td>
                  <td className="border border-black p-0.5 font-mono text-sm">{day.dhuhr}</td>
                  <td className="border border-black p-0.5 font-mono font-bold text-red-700 text-sm">{day.maghrib}</td>
                  <td className="border border-black p-0.5 text-right pr-3 text-[10px]">
                    {dayOccasion ? (
                      <span className={`font-bold ${dayOccasion.eventType === 'MARTYRDOM' || dayOccasion.eventType === 'DEATH' ? 'text-red-700' : 'text-emerald-primary'}`}>
                        {dayOccasion.title}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer / Footnotes */}
      <div className="mt-4 border-t border-black pt-2 text-[10px] leading-relaxed">
        <div className="space-y-1">
          <div>
            <strong>• رموز الزواج:</strong>
            <span className="mr-2"><strong>✓</strong> صالحة للزواج (العقد والدخلة)</span>
            <span className="mr-4"><strong>×</strong> تدل على أن اليوم وليلتة مكروه فيه الزواج (العقد والدخلة)</span>
            <span className="mr-4"><strong>&</strong> صالحة للعقد ومكروه فيه الزواج</span>
          </div>
          <div>
            <strong>• الأوقات التقديرية للصلاة</strong> على حسب تقويم العجيري، وينبغي الاحتياط لصلاة الصبح بعد الفجر لاختلاف التقاويم.
          </div>
          <div>
            <strong>• ثبوت الهلال</strong> يعتمد حسب الرؤية الشرعية.
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-gray-200 mt-2 pt-2 text-[9px] text-gray-500">
          <div>صفحة {monthNum} من 12</div>
          <div className="flex items-center gap-1.5">
            <span> معرف التواصل: <strong>matam_abusaiba</strong></span>
            <span className="mx-2">|</span>
            <span> خدمة الواتس أب: <strong>34195510</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
