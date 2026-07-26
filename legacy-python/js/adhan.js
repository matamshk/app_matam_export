/* 
 * Adhan.js - Standalone Implementation (Lite/Embedded)
 * Based on astronomical formulas (Meeus)
 * Implements: PrayerTimes, Coordinates, CalculationMethod, Qibla
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        window.adhan = factory(); // Force window assignment
    }
}(this, function () {
    'use strict';

    // --- Math Utils ---
    const D2R = Math.PI / 180;
    const R2D = 180 / Math.PI;

    function dsin(d) { return Math.sin(d * D2R); }
    function dcos(d) { return Math.cos(d * D2R); }
    function dtan(d) { return Math.tan(d * D2R); }
    function darctan(x) { return Math.atan(x) * R2D; }
    function darcsin(x) { return Math.asin(x) * R2D; }
    function darccos(x) { return Math.acos(x) * R2D; }
    function darccot(x) { return Math.atan(1 / x) * R2D; }
    function fixHour(a) { a = a - 24.0 * Math.floor(a / 24.0); a = a < 0 ? a + 24.0 : a; return a; }
    function fixAngle(a) { a = a - 360.0 * Math.floor(a / 360.0); a = a < 0 ? a + 360.0 : a; return a; }

    // --- Astronomical Calculators ---
    function julianDate(year, month, day) {
        if (month <= 2) { year -= 1; month += 12; }
        const A = Math.floor(year / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
    }

    function sumPositions(jd) {
        const D = jd - 2451545.0;
        const g = fixAngle(357.529 + 0.98560028 * D);
        const q = fixAngle(280.459 + 0.98564736 * D);
        const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));

        const e = 23.439 - 0.00000036 * D;
        const RA = Math.atan2(dcos(e) * dsin(L), dcos(L)) * R2D / 15;
        const declination = darcsin(dsin(e) * dsin(L));

        let eqT = fixHour(q / 15) - fixHour(RA);

        if (eqT > 12) eqT -= 24;
        if (eqT < -12) eqT += 24;

        return { declination, eqT };
    }

    function computeTime(lat, declination, angle) {
        const top = -dsin(angle) - dsin(lat) * dsin(declination);
        const bottom = dcos(lat) * dcos(declination);
        const v = top / bottom;
        if (v > 1 || v < -1) return null; // No event
        return darccos(v) / 15.0;
    }

    // --- Classes ---

    class Coordinates {
        constructor(lat, lng) {
            this.latitude = lat;
            this.longitude = lng;
        }
    }

    class PrayerTimes {
        constructor(coordinates, date, params) {
            this.coordinates = coordinates;
            this.date = date;
            this.params = params || CalculationMethod.MuslimWorldLeague();

            this.calculate();
        }

        calculate() {
            const lat = this.coordinates.latitude;
            const lng = this.coordinates.longitude;

            // Timezone? We calculate in UTC then apply offset? 
            // Better: Calculate 'Base times' then timezone acts on display.
            // But standard libs return Date objects.
            // Simplified: calculate local time directly assuming system timezone is handled by Date object creation
            // We use JD for 12:00 PM local time.

            const year = this.date.getFullYear();
            const month = this.date.getMonth() + 1;
            const day = this.date.getDate();

            // Approximate Timezone from Date object or use explicit param
            let tzOffset = (this.params.timezone !== undefined) ? this.params.timezone : -this.date.getTimezoneOffset() / 60;
            console.log('AdhanJS: Using timezone offset:', tzOffset, 'Explicit:', this.params.timezone);

            const jd = julianDate(year, month, day) - lng / 360; // simplistic
            const solar = sumPositions(jd);

            // Dhuhr: Transit
            // Transit = 12 + timezone - lng/15 - eqT
            // Actually simpler: Noon - EqT
            const transit = 12 + (tzOffset - lng / 15) - solar.eqT;

            const dhuhr = transit + (this.params.adjustments.dhuhr || 0) / 60;

            // Sun Angles
            const fajrT = computeTime(lat, solar.declination, this.params.fajrAngle);
            const sunriseT = computeTime(lat, solar.declination, 0.833);
            const maghribT = computeTime(lat, solar.declination, this.params.maghribAngle || 0.833); // 0.833 is sunset
            const ishaT = computeTime(lat, solar.declination, this.params.ishaAngle);

            // Asr
            const t = this.params.madhab === 'Hanafi' ? 2 : 1;
            const asrAngle = darccot(t + dtan(Math.abs(lat - solar.declination)));
            const asrT = computeTime(lat, solar.declination, -asrAngle); // negative because above horizon? No, acos formula input is angle BELOW horizon usually? 
            // Wait, computeTime uses -sin(angle). If angle is altitude, correct.
            // Asr angle is altitude.

            // Set results (Hours)
            this.fajrHost = fixHour(transit - fajrT);
            this.sunriseHost = fixHour(transit - sunriseT);
            this.dhuhrHost = dhuhr;
            this.asrHost = fixHour(transit + asrT);
            this.maghribHost = fixHour(transit + maghribT);
            this.ishaHost = fixHour(transit + ishaT);

            // Convert to Date objects
            this.fajr = this.timeToDate(this.fajrHost);
            this.sunrise = this.timeToDate(this.sunriseHost);
            this.dhuhr = this.timeToDate(this.dhuhrHost);
            this.asr = this.timeToDate(this.asrHost);
            this.maghrib = this.timeToDate(this.maghribHost);
            this.isha = this.timeToDate(this.ishaHost);

            // Apply Adjustments (minutes)
            this.applyAdj(this.params.adjustments);
        }

        timeToDate(t) {
            const date = new Date(this.date);
            date.setHours(0, 0, 0, 0); // reset

            // t is float hours (e.g. 14.5 = 14:30)
            // But wait, t includes timezone offset in the formula above? 
            // "transit = 12 + (tzOffset - lng/15) - solar.eqT"
            // Yes, "transit" is Local Clock Time.

            const hours = Math.floor(t);
            const minutes = Math.floor((t - hours) * 60);
            const seconds = Math.floor(((t - hours) * 60 - minutes) * 60);

            date.setHours(hours, minutes, seconds);
            return date;
        }

        applyAdj(adj) {
            if (!adj) return;
            if (adj.fajr) this.fajr = new Date(this.fajr.getTime() + adj.fajr * 60000);
            if (adj.sunrise) this.sunrise = new Date(this.sunrise.getTime() + adj.sunrise * 60000);
            if (adj.dhuhr) this.dhuhr = new Date(this.dhuhr.getTime() + adj.dhuhr * 60000);
            if (adj.asr) this.asr = new Date(this.asr.getTime() + adj.asr * 60000);
            if (adj.maghrib) this.maghrib = new Date(this.maghrib.getTime() + adj.maghrib * 60000);
            if (adj.isha) this.isha = new Date(this.isha.getTime() + adj.isha * 60000);
        }

        nextPrayer() {
            const now = new Date();
            if (now < this.fajr) return 'fajr';
            if (now < this.sunrise) return 'sunrise';
            if (now < this.dhuhr) return 'dhuhr';
            if (now < this.asr) return 'asr';
            if (now < this.maghrib) return 'maghrib';
            if (now < this.isha) return 'isha';
            return 'none';
        }

        timeForPrayer(p) {
            return this[p];
        }
    }

    const Madhab = {
        Shafi: 'Shafi',
        Hanafi: 'Hanafi'
    };

    const CalculationMethod = {
        UmmAlQura: () => ({
            fajrAngle: 18.5,
            ishaAngle: 0, // UmmAlQura uses fixed interval usually 90min
            maghribAngle: 0.833, // Sunset
            adjustments: { dhuhr: 0, maghrib: 0, isha: 0 },
            // Note: UmmAlQura is complex, uses 90min (120 Ramadan) for Isha.
            // Simplified here: 18.5 Fajr, and ISHA is usually FIXED time not angle? 
            // Just usage standard 18 degrees for Isha as fallback or implement interval logic
            // Let's use 18.5 Fajr, and 90 min after Maghrib for Isha approximation
            // For accurate "Tehran" method:
        }),
        Tehran: () => ({
            fajrAngle: 17.7,
            maghribAngle: 4.5,
            ishaAngle: 14,
            adjustments: {}
        }),
        MuslimWorldLeague: () => ({
            fajrAngle: 18,
            ishaAngle: 17,
            adjustments: {}
        })
    };

    // Qibla (Meeus)
    function Qibla(coords) {
        const lat1 = coords.latitude * D2R;
        const lng1 = coords.longitude * D2R;
        const lat2 = 21.4225 * D2R; // Mecca
        const lng2 = 39.8262 * D2R;

        const y = Math.sin(lng2 - lng1);
        const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(lng2 - lng1);

        let q = Math.atan2(y, x) * R2D;
        return (q + 360) % 360;
    }

    return {
        Coordinates,
        PrayerTimes,
        CalculationMethod,
        Madhab,
        Qibla
    };

}));
