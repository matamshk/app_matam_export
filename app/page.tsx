import React from "react";
import { prisma } from "@/lib/prisma";
import { getBahrainTime, hijriMonthsNames, gregMonthsNamesAr } from "@/lib/hijri";
import CountdownTimer from "@/components/CountdownTimer";
import MonthYearSelector from "@/components/MonthYearSelector";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedYear = parseInt(params.year || "1448", 10);
  const selectedMonthNum = parseInt(params.month || "1", 10);

  // Fetch years list for selectors (1448 to 1458)
  const years = await prisma.year.findMany({
    orderBy: { hijriYear: "asc" }
  });

  // Fetch selected month days
  const monthData = await prisma.month.findUnique({
    where: {
      yearId_monthNumber: {
        yearId: selectedYear,
        monthNumber: selectedMonthNum
      }
    },
    include: {
      days: {
        orderBy: { gregorianDate: "asc" }
      }
    }
  });

  // Fetch Site Settings
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "global" }
  });

  const whatsappPhone = settings?.whatsappPhone || "34195510";

  // Fetch occasions for this month to display in calendar
  const occasions = await prisma.event.findMany({
    where: {
      hijriMonth: selectedMonthNum,
      isPublished: true,
      displayInCalendar: true
    }
  });

  // Get current Bahrain Date/Time
  const bhTime = getBahrainTime();
  
  // Find current day entry
  const todayDay = monthData?.days.find((d: any) => d.gregorianDate === bhTime.dateString);
  const defaultDay = monthData?.days[0];
  const activeDay = todayDay || defaultDay;

  const fajrTime = activeDay?.fajr || "03:20";
  const dhuhrTime = activeDay?.dhuhr || "11:38";
  const maghribTime = activeDay?.maghrib || "18:48";

  // Dynamic next month and prev month URLs
  const nextMonthNum = selectedMonthNum === 12 ? 1 : selectedMonthNum + 1;
  const nextYearNum = selectedMonthNum === 12 ? selectedYear + 1 : selectedYear;
  const prevMonthNum = selectedMonthNum === 1 ? 12 : selectedMonthNum - 1;
  const prevYearNum = selectedMonthNum === 1 ? selectedYear - 1 : selectedYear;

  // Gregorian month label for the header
  let gregHeaderMonth = "";
  if (monthData && monthData.days.length > 0) {
    const firstDay = monthData.days[0];
    const parts = firstDay.gregorianDate.split("-");
    const mIdx = parseInt(parts[1], 10) - 1;
    gregHeaderMonth = gregMonthsNamesAr[mIdx];
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 1. Large Card for Today */}
      <section className="mb-8">
        <div className="bg-white border border-border-custom rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-custom pb-4 mb-6">
            <div>
              <span className="text-emerald-primary text-sm font-semibold mb-1 block">مواقيت الصلاة لمأتم أبو صيبع الشرقي – مملكة البحرين</span>
              <h2 className="text-2xl font-extrabold text-text-primary">
                اليوم: {activeDay?.dayNameAr} | {activeDay?.hijriDay} {hijriMonthsNames[selectedMonthNum - 1]} {selectedYear}هـ
              </h2>
              <p className="text-sm text-text-secondary mt-1">الموافق: {activeDay?.gregorianDate}</p>
            </div>
            {todayDay?.notes && (
              <div className="bg-gold-light/20 text-gold-primary text-xs font-semibold px-3 py-1.5 rounded-lg mt-3 md:mt-0">
                📢 {todayDay.notes}
              </div>
            )}
          </div>

          {/* 3 Prayer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Fajr */}
            <div className="border border-border-custom bg-emerald-light/5 p-5 rounded-xl text-center flex flex-col items-center">
              <span className="text-sm text-text-secondary font-medium">صلاة الصبح</span>
              <span className="text-3xl font-bold text-emerald-primary mt-2 font-mono">{fajrTime}</span>
              <span className="text-xs text-text-secondary mt-1">توقيت الأذان</span>
            </div>
            
            {/* Dhuhr */}
            <div className="border border-border-custom bg-emerald-light/5 p-5 rounded-xl text-center flex flex-col items-center">
              <span className="text-sm text-text-secondary font-medium">صلاة الظهرين</span>
              <span className="text-3xl font-bold text-emerald-primary mt-2 font-mono">{dhuhrTime}</span>
              <span className="text-xs text-text-secondary mt-1">توقيت الأذان</span>
            </div>
            
            {/* Maghrib */}
            <div className="border border-border-custom bg-emerald-light/5 p-5 rounded-xl text-center flex flex-col items-center">
              <span className="text-sm text-text-secondary font-medium">صلاة المغربين</span>
              <span className="text-3xl font-bold text-emerald-primary mt-2 font-mono">{maghribTime}</span>
              <span className="text-xs text-text-secondary mt-1">توقيت الأذان</span>
            </div>
          </div>

          {/* Countdown live component */}
          <CountdownTimer fajr={fajrTime} dhuhr={dhuhrTime} maghrib={maghribTime} />
        </div>
      </section>

      {/* 2. Control Bar */}
      <MonthYearSelector 
        selectedYear={selectedYear}
        selectedMonthNum={selectedMonthNum}
        hijriMonthsNames={hijriMonthsNames}
        years={years}
        prevYearNum={prevYearNum}
        prevMonthNum={prevMonthNum}
        nextYearNum={nextYearNum}
        nextMonthNum={nextMonthNum}
      />

      {/* 3. Monthly Calendar Grid */}
      <section className="bg-white border border-border-custom rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-emerald-primary text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">جدول شهر {hijriMonthsNames[selectedMonthNum - 1]} 1448هـ</h3>
          <span className="text-sm font-medium text-gold-light">المطابق لـ: {gregHeaderMonth}</span>
        </div>

        {/* Large screen table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-emerald-light/10 text-emerald-dark font-bold border-b border-border-custom">
                <th className="p-3 border-l border-border-custom">الزواج</th>
                <th className="p-3 border-l border-border-custom">اليوم</th>
                <th className="p-3 border-l border-border-custom">الهجري</th>
                <th className="p-3 border-l border-border-custom">الميلادي</th>
                <th className="p-3 border-l border-border-custom">فجر</th>
                <th className="p-3 border-l border-border-custom">شروق</th>
                <th className="p-3 border-l border-border-custom">ظهر</th>
                <th className="p-3 border-l border-border-custom">مغرب</th>
                <th className="p-3 border-l border-border-custom">القمر</th>
                <th className="p-3">المناسبات الدينية</th>
              </tr>
            </thead>
            <tbody>
              {monthData?.days.map((day: any, idx: number) => {
                const isFriday = day.dayNameAr === "الجمعة";
                const isToday = day.gregorianDate === bhTime.dateString;
                
                // Find matching occasion for the day
                // Apply month start offset if any
                const adjustedDay = day.hijriDay; 
                const dayOccasion = occasions.find((o: any) => o.hijriDay === adjustedDay);

                let marriageColor = "text-text-primary";
                if (day.marriageCode === "✓") marriageColor = "text-green-600 font-extrabold";
                if (day.marriageCode === "×") marriageColor = "text-red-500 font-extrabold";
                if (day.marriageCode === "&") marriageColor = "text-yellow-600 font-extrabold";

                return (
                  <tr key={day.id} className={`border-b border-border-custom hover:bg-emerald-light/5 transition ${isToday ? 'bg-gold-light/15 font-bold' : isFriday ? 'bg-emerald-light/5' : ''}`}>
                    <td className={`p-3 border-l border-border-custom ${marriageColor}`}>{day.marriageCode}</td>
                    <td className="p-3 border-l border-border-custom">{day.dayNameAr}</td>
                    <td className="p-3 border-l border-border-custom font-semibold">{day.hijriDay}</td>
                    <td className="p-3 border-l border-border-custom font-mono text-sm">{day.gregorianDate}</td>
                    <td className="p-3 border-l border-border-custom font-mono">{day.fajr}</td>
                    <td className="p-3 border-l border-border-custom font-mono">{day.sunrise}</td>
                    <td className="p-3 border-l border-border-custom font-mono">{day.dhuhr}</td>
                    <td className="p-3 border-l border-border-custom font-mono font-bold text-emerald-primary">{day.maghrib}</td>
                    <td className="p-3 border-l border-border-custom text-xs font-semibold text-purple-700">{day.moonStatus || "--"}</td>
                    <td className="p-3 text-right text-xs">
                      {dayOccasion ? (
                        <span className={`font-bold ${dayOccasion.eventType === 'MARTYRDOM' || dayOccasion.eventType === 'DEATH' ? 'text-red-600' : 'text-emerald-primary'}`}>
                          {dayOccasion.title}
                        </span>
                      ) : (
                        <span className="text-text-secondary">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Accordion style cards */}
        <div className="block md:hidden p-4 space-y-4">
          {monthData?.days.map((day: any) => {
            const isToday = day.gregorianDate === bhTime.dateString;
            const adjustedDay = day.hijriDay; 
            const dayOccasion = occasions.find((o: any) => o.hijriDay === adjustedDay);
            
            return (
              <div key={day.id} className={`border border-border-custom rounded-xl p-4 shadow-sm ${isToday ? 'bg-gold-light/10 border-gold-primary/50' : 'bg-white'}`}>
                <div className="flex justify-between items-center border-b border-border-custom pb-2 mb-2">
                  <span className="font-bold text-sm">{day.dayNameAr} {day.hijriDay} {hijriMonthsNames[selectedMonthNum - 1]}</span>
                  <span className="text-xs text-text-secondary font-mono">{day.gregorianDate}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  <div>
                    <span className="text-[10px] text-text-secondary block">فجر</span>
                    <span className="font-bold font-mono text-sm">{day.fajr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block">شروق</span>
                    <span className="font-bold font-mono text-sm">{day.sunrise}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block">ظهر</span>
                    <span className="font-bold font-mono text-sm">{day.dhuhr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-primary block">مغرب</span>
                    <span className="font-bold font-mono text-sm text-emerald-primary">{day.maghrib}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span>الزواج: <strong className="text-sm">{day.marriageCode || "--"}</strong></span>
                  {day.moonStatus && <span className="text-purple-700 font-semibold">{day.moonStatus}</span>}
                </div>

                {dayOccasion && (
                  <div className="bg-emerald-light/10 text-emerald-dark text-xs p-2 rounded-lg mt-2 font-bold text-center">
                    🌟 {dayOccasion.title}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Legend Section */}
      <section className="bg-white border border-border-custom rounded-2xl p-6 shadow-sm no-print">
        <h4 className="font-bold border-b border-border-custom pb-2 mb-4">توضيح الرموز وملاحظات التقويم</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h5 className="font-bold text-emerald-primary mb-2">• رموز الزواج:</h5>
            <ul className="space-y-2">
              <li><strong>✓</strong> صالحة للزواج (العقد والدخلة).</li>
              <li><strong>×</strong> تدل على أن اليوم وليلتة مكروه فيه الزواج (العقد والدخلة).</li>
              <li><strong>&</strong> صالحة للعقد ومكروه فيه الزواج.</li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-emerald-primary mb-2">• ملاحظات هامة:</h5>
            <ul className="space-y-2 text-text-secondary">
              <li>• الأوقات التقديرية للصلاة على حسب تقويم العجيري، وينبغي الاحتياط لصلاة الصبح بعد الفجر لاختلاف التقاويم.</li>
              <li>• ثبوت الهلال يعتمد حسب الرؤية الشرعية.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Widget */}
      <a 
        href={`https://wa.me/973${whatsappPhone}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-xl z-50 transition transform hover:scale-110 flex items-center justify-center no-print"
      >
        💬 خدمة الواتس أب: {whatsappPhone}
      </a>
    </div>
  );
}
