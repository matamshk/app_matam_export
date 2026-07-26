"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MonthYearSelectorProps {
  selectedYear: number;
  selectedMonthNum: number;
  hijriMonthsNames: string[];
  years: { hijriYear: number }[];
  prevYearNum: number;
  prevMonthNum: number;
  nextYearNum: number;
  nextMonthNum: number;
}

export default function MonthYearSelector({
  selectedYear,
  selectedMonthNum,
  hijriMonthsNames,
  years,
  prevYearNum,
  prevMonthNum,
  nextYearNum,
  nextMonthNum
}: MonthYearSelectorProps) {
  const router = useRouter();

  return (
    <section className="mb-6 flex flex-wrap justify-between items-center gap-4 no-print" id="calendar-section">
      <div className="flex gap-2">
        <Link href={`/?year=${prevYearNum}&month=${prevMonthNum}`} className="bg-white hover:bg-emerald-light/10 border border-border-custom px-4 py-2 rounded-lg text-sm transition">
          الشهر السابق ◀
        </Link>
        <Link href={`/?year=${nextYearNum}&month=${nextMonthNum}`} className="bg-white hover:bg-emerald-light/10 border border-border-custom px-4 py-2 rounded-lg text-sm transition">
          ▶ الشهر التالي
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Month selector dropdown */}
        <select 
          defaultValue={selectedMonthNum}
          onChange={(e) => router.push(`/?year=${selectedYear}&month=${e.target.value}`)}
          className="bg-white border border-border-custom px-3 py-2 rounded-lg text-sm"
        >
          {hijriMonthsNames.map((name, idx) => (
            <option key={idx} value={idx + 1}>{name}</option>
          ))}
        </select>

        {/* Year selector dropdown */}
        <select 
          defaultValue={selectedYear}
          onChange={(e) => router.push(`/?year=${e.target.value}&month=${selectedMonthNum}`)}
          className="bg-white border border-border-custom px-3 py-2 rounded-lg text-sm"
        >
          {years.map((y: any) => (
            <option key={y.hijriYear} value={y.hijriYear}>{y.hijriYear} هـ</option>
          ))}
        </select>
        
        <Link href={`/calendar/${selectedYear}/${selectedMonthNum}/print`} target="_blank" className="bg-gold-primary hover:bg-gold-primary/95 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
          📄 طباعة الشهر
        </Link>
      </div>
    </section>
  );
}
