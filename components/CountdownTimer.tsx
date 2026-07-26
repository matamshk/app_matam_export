"use client";

import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  fajr: string;
  dhuhr: string;
  maghrib: string;
}

export default function CountdownTimer({ fajr, dhuhr, maghrib }: CountdownTimerProps) {
  const [nextPrayerName, setNextPrayerName] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [countdownText, setCountdownText] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate times in Bahrain timezone
      const now = new Date();
      const options = { timeZone: "Asia/Bahrain", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } as const;
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(now);
      const val = (name: string) => parts.find(p => p.type === name)?.value || "0";
      
      const currentH = parseInt(val("hour"), 10);
      const currentM = parseInt(val("minute"), 10);
      const currentS = parseInt(val("second"), 10);
      
      const currentSeconds = currentH * 3600 + currentM * 60 + currentS;

      const parseTimeToSec = (tStr: string) => {
        const [h, m] = tStr.split(":").map(Number);
        return h * 3600 + m * 60;
      };

      const fSec = parseTimeToSec(fajr);
      const dSec = parseTimeToSec(dhuhr);
      const mSec = parseTimeToSec(maghrib);

      let targetSec = 0;
      let name = "";

      if (currentSeconds < fSec) {
        targetSec = fSec;
        name = "صلاة الصبح";
      } else if (currentSeconds < dSec) {
        targetSec = dSec;
        name = "صلاة الظهرين";
      } else if (currentSeconds < mSec) {
        targetSec = mSec;
        name = "صلاة المغربين";
      } else {
        // Next day Fajr
        targetSec = fSec + 24 * 3600;
        name = "صلاة الصبح (الغد)";
      }

      setNextPrayerName(name);

      const diffSec = targetSec - currentSeconds;
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setCountdownText(`المتبقي لـ ${name}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [fajr, dhuhr, maghrib]);

  return (
    <div className="bg-emerald-dark text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="text-center md:text-right">
        <span className="text-gold-light text-xs font-semibold uppercase tracking-wider block mb-1">الـصـلاة الـقـادمـة</span>
        <h3 className="text-2xl font-bold">{nextPrayerName || "صلاة الصبح"}</h3>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-3xl md:text-4xl font-mono font-bold text-gold-primary tracking-wider">{timeLeft || "--:--:--"}</span>
        <span className="text-xs text-white/60 mt-1">{countdownText || "جاري احتساب المتبقي..."}</span>
      </div>
    </div>
  );
}
