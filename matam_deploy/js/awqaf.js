
// awqaf.js - Prayer Times & Qibla Logic

document.addEventListener('DOMContentLoaded', () => {
    initAwqafPage();
});

let currentCoordinates = { latitude: 26.2285, longitude: 50.5860 }; // Default: Bahrain
let currentCalculationMethod = 'UmmAlQura';

function initAwqafPage() {
    setupLocationControls();
    updatePrayerTimes();
    generateMonthlyCalendar();
}

// 1. Location & Prayer Calculation
function setupLocationControls() {
    const btn = document.getElementById('locateBtn');
    const select = document.getElementById('citySelect');

        btn.addEventListener('click', () => {
            if (navigator.geolocation) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديد...';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        currentCoordinates = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        };
                        select.value = 'auto'; // Set dropdown to auto
                        btn.innerHTML = '<i class="fas fa-check"></i> تم التحديد';
                        updatePrayerTimes();
                        generateMonthlyCalendar();
                    },
                    (error) => {
                        alert('تعذر تحديد الموقع تلقائياً. يرجى الاختيار من القائمة.');
                        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> تحديد موقعي';
                    }
                );
            } else {
                alert('المتصفح لا يدعم تحديد الموقع.');
            }
        });

        select.addEventListener('change', (e) => {
            if (e.target.value !== 'auto') {
                const [lat, lng] = e.target.value.split(',').map(Number);
                currentCoordinates = { latitude: lat, longitude: lng };
                updatePrayerTimes();
                generateMonthlyCalendar();
            }
        });
    }

function updatePrayerTimes() {
    if (typeof adhan === 'undefined') {
        console.error('Adhan library not loaded');
        return;
    }

    const coordinates = new adhan.Coordinates(currentCoordinates.latitude, currentCoordinates.longitude);
    const date = new Date();
    // Uses Tehran method (Fajr 17.7°, Isha 14°, Maghrib 4.5°/Red Twlight)
    // BUT commonly adds ~15 min to Sunset for Maghrib.
    const params = adhan.CalculationMethod.Tehran();
    params.madhab = adhan.Madhab.Shafi; // Asr factor standard

    // Adjustments (Minutes) - Fine usage for Bahrain (Taqwim Al-Sayegh match)
    params.adjustments.fajr = 13;
    params.adjustments.sunrise = 0;
    params.adjustments.dhuhr = 2;
    params.adjustments.asr = 0;
    params.adjustments.maghrib = 15; // 15 min after sunset
    params.adjustments.isha = 0;

    // Force Bahrain Timezone (UTC+3)
    params.timezone = 3;

    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

    const timeFormat = (t) => {
        let hours = t.getHours();
        const minutes = t.getMinutes().toString().padStart(2, '0');
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes}`;
    };

    const names = {
        fajr: 'مجال الفجر',
        sunrise: 'الشروق',
        dhuhr: 'الظهر',
        asr: 'العصر',
        maghrib: 'المغرب',
        isha: 'العشاء'
    };

    const container = document.getElementById('prayerList');
    let html = '';

    // Find next prayer
    const now = new Date();
    let nextPrayer = prayerTimes.nextPrayer();
    let nextPrayerTime = prayerTimes.timeForPrayer(nextPrayer);

    // If next prayer is 'none', it means tomorrow's Fajr
    if (nextPrayer === 'none') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPrayers = new adhan.PrayerTimes(coordinates, tomorrow, params);
        nextPrayer = 'fajr';
        nextPrayerTime = tomorrowPrayers.fajr;
    }

    // Display
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
        const isNext = p === nextPrayer;
        const time = prayerTimes[p];
        html += `
            <div class="prayer-row ${isNext ? 'next-prayer' : ''}" style="color: ${isNext ? 'var(--gold-primary)' : '#ffffff'}; font-weight: ${isNext ? 'bold' : 'normal'};">
                <span>${names[p]}</span>
                <span style="font-family: monospace; font-size: 1.1em;">${timeFormat(time)}</span>
            </div>
        `;
    });

    container.innerHTML = html;

    // Update Next Prayer Badge
    const nextName = names[nextPrayer] || nextPrayer;
    document.getElementById('nextPrayerName').textContent = nextName;
    document.getElementById('nextPrayerTime').textContent = timeFormat(nextPrayerTime);
}


function generateMonthlyCalendar() {
    if (typeof adhan === 'undefined') return;

    const coordinates = new adhan.Coordinates(currentCoordinates.latitude, currentCoordinates.longitude);
    const params = adhan.CalculationMethod.Tehran();
    params.madhab = adhan.Madhab.Shafi; 
    params.adjustments.maghrib = 15; 
    params.timezone = 3;

    const tbody = document.getElementById('monthlyPrayerTableBody');
    if (!tbody) return;

    const timeFormat = (t) => {
        let hours = t.getHours();
        const minutes = t.getMinutes().toString().padStart(2, '0');
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${minutes}`;
    };

    const today = new Date();
    // Start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    // End of month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Hijri offset logic
    const offset = parseInt(localStorage.getItem('hijriOffset') || '0');

    let html = '';

    for (let i = 1; i <= endOfMonth.getDate(); i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const times = new adhan.PrayerTimes(coordinates, date, params);
        
        const isToday = (i === today.getDate());
        const rowBg = isToday ? "rgba(212, 175, 55, 0.1)" : (i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent");
        const textStyle = isToday ? "font-weight: bold; color: var(--gold-primary);" : "color: #ffffff;";
        
        // --- Added Calculations ---
        // 1. Day Name
        const dayName = new Intl.DateTimeFormat('ar-BH', { weekday: 'long' }).format(date);
        
        // 2. Gregorian short format (e.g. 21)
        const gDay = date.getDate();
        
        // 3. Hijri Date
        const hDateObj = new Date(date.getTime() + offset * 86400000);
        let hDay = "";
        try {
            hDay = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', calendar: 'islamic-umalqura' }).format(hDateObj);
        } catch(e) {
            hDay = "--";
        }
        
        // 4. Imsak (Typically 15 minutes before Fajr)
        const imsakTime = new Date(times.fajr.getTime() - 15 * 60000);
        
        // 5. Midnight (Halfway between Sunset/Maghrib and Tomorrow's Fajr)
        const tomorrow = new Date(date.getTime() + 86400000);
        const tomorrowTimes = new adhan.PrayerTimes(coordinates, tomorrow, params);
        const midnightTime = new Date(times.maghrib.getTime() + (tomorrowTimes.fajr.getTime() - times.maghrib.getTime()) / 2);
        
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: ${rowBg}; ${textStyle} transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; border-left: 1px solid rgba(255,255,255,0.02);">${dayName}</td>
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; font-family: monospace; font-size: 1.1em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'}; border-left: 1px solid rgba(255,255,255,0.02);">${gDay}</td>
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; font-family: Tajawal; font-size: 1.1em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'}; border-left: 1px solid rgba(255,255,255,0.02);">${hDay}</td>
                
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: var(--gold-primary); font-weight: 500; border-left: 1px solid rgba(255,255,255,0.02);">${timeFormat(imsakTime)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.fajr)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.sunrise)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.dhuhr)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.asr)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.maghrib)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.isha)}</td>
                <td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff; border-right: 1px solid rgba(255,255,255,0.02);">${timeFormat(midnightTime)}</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

window.printMonthlyCalendar = function() {
    window.print();
};

// 4. Share Card
function shareCard(cardId) {
    const card = document.getElementById(cardId);
    html2canvas(card).then(canvas => {
        const link = document.createElement('a');
        link.download = `prayer_times_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}
