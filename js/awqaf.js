
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
    updatePrayerReferenceButton();
}

function updatePrayerReferenceButton() {
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        const btn = document.getElementById('prayerRefDownloadBtn');
        if (btn) {
            if (settings.prayer_reference_url) {
                btn.href = settings.prayer_reference_url;
                btn.style.display = 'inline-flex';
                
                // Add click handler to open lightbox instead of normal navigation
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showCalendarLightbox(settings.prayer_reference_url);
                });
            } else {
                btn.style.display = 'none';
            }
        }
    } catch(e) {
        console.error("Error updating prayer reference button:", e);
    }
}

function showCalendarLightbox(url) {
    const existing = document.getElementById('calendarLightboxModal');
    if (existing) existing.remove();
    
    const isPdf = url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf');
    const isJson = url.toLowerCase().endsWith('.json');
    let contentHtml = '';
    
    if (isPdf) {
        if (url.startsWith('data:')) {
            contentHtml = `
                <div style="color: white; padding: 30px; text-align: center; font-family: 'Tajawal', sans-serif;">
                    <i class="fas fa-file-pdf" style="font-size: 4rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                    <h3 style="color: var(--gold-primary, #d4af37); margin-bottom: 15px;">جدول مواقيت الصلاة المعتمد (PDF)</h3>
                    <p style="color: #ccc; margin-bottom: 20px; font-size: 0.95rem;">الملف المرفق هو مستند PDF. يمكنك تحميله لفتحه وعرضه على جهازك.</p>
                    <a href="${url}" download="prayer_calendar.pdf" style="background: var(--gold-primary, #d4af37); color: #000; padding: 12px 25px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">تحميل ملف PDF</a>
                </div>
            `;
        } else {
            const absoluteUrl = window.location.origin + url;
            const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(absoluteUrl)}`;
            contentHtml = `
                <iframe src="${viewerUrl}" style="width: 100%; height: 70vh; border: none; border-radius: 8px; background: white;"></iframe>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="${url}" download style="background: var(--gold-primary, #d4af37); color: #000; padding: 10px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-family: 'Tajawal';"><i class="fas fa-download"></i> تحميل مباشر للملف</a>
                </div>
            `;
        }
    } else if (isJson) {
        contentHtml = `
            <div style="color: white; padding: 30px; text-align: center; font-family: 'Tajawal', sans-serif;">
                <i class="fas fa-file-code" style="font-size: 4rem; color: #f1c40f; margin-bottom: 20px;"></i>
                <h3 style="color: var(--gold-primary, #d4af37); margin-bottom: 15px;">ملف مواقيت الصلاة والتقويم الرقمي (JSON)</h3>
                <p style="color: #ccc; margin-bottom: 20px; font-size: 0.95rem;">الملف المرفق هو ملف التقويم المعتمد لمأتم أبو صيبع الشرقي لعام 1448 هـ بصيغة JSON الرقمية.</p>
                <a href="${url}" download="تقويم-مأتم-أبو-صيبع-الشرقي-1448.json" style="background: var(--gold-primary, #d4af37); color: #000; padding: 12px 25px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;"><i class="fas fa-download"></i> تحميل ملف JSON المعتمد</a>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="text-align: center;">
                <img src="${url}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(212,175,55,0.3);">
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <a href="${url}" download style="background: var(--gold-primary, #d4af37); color: #000; padding: 10px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-family: 'Tajawal';"><i class="fas fa-download"></i> تحميل مباشر للملف</a>
            </div>
        `;
    }
    
    const modalHtml = `
    <div id="calendarLightboxModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(8px);">
        <div style="background: #111111; border-radius: 16px; padding: 25px; width: 100%; max-width: 800px; border: 2px solid var(--gold-primary, #d4af37); box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative; max-height: 90vh; overflow-y: auto;">
            <button id="btnCloseLightbox" style="position: absolute; top: 15px; left: 15px; background: transparent; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; z-index: 10;"><i class="fas fa-times"></i></button>
            <div id="lightboxContent" style="margin-top: 15px;">
                ${contentHtml}
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('btnCloseLightbox').addEventListener('click', () => {
        document.getElementById('calendarLightboxModal').remove();
    });
    
    document.getElementById('calendarLightboxModal').addEventListener('click', (e) => {
        if (e.target.id === 'calendarLightboxModal') {
            document.getElementById('calendarLightboxModal').remove();
        }
    });
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

    // Settings
    let hiddenPrayers = [];
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        if (settings.hidden_prayers) hiddenPrayers = settings.hidden_prayers;
    } catch(e) {}

    // Display
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
        if (hiddenPrayers.includes(p)) return; // Skip if hidden
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


function subtractMinutesStr(timeStr, minutes) {
    if (!timeStr) return '';
    try {
        const [hStr, mStr] = timeStr.split(':');
        let h = parseInt(hStr);
        let m = parseInt(mStr);
        let total = h * 60 + m - minutes;
        if (total < 0) total += 24 * 60;
        const newH = Math.floor(total / 60) % 24;
        const newM = total % 60;
        return `${newH}:${newM.toString().padStart(2, '0')}`;
    } catch(e) {
        return timeStr;
    }
}

window.changeHijriMonth = function() {
    const val = document.getElementById('hijriMonthSelect').value;
    generateMonthlyCalendar(parseInt(val));
};

function generateMonthlyCalendar(selectedMonthNum = null) {
    const tbody = document.getElementById('monthlyPrayerTableBody');
    const printTbody = document.getElementById('printTableBody');
    if (!tbody) return;

    let prayerDb = null;
    let settings = {};
    try {
        settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        prayerDb = settings.prayer_calendar_database;
    } catch(e) {
        console.error("Error reading site_settings:", e);
    }

    if (!prayerDb && window.OFFLINE_PRAYER_CALENDAR_DATABASE) {
        prayerDb = window.OFFLINE_PRAYER_CALENDAR_DATABASE;
    }

    const today = new Date();
    if (!selectedMonthNum) {
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        if (prayerDb && prayerDb[todayKey] && prayerDb[todayKey].hijri_month) {
            selectedMonthNum = prayerDb[todayKey].hijri_month;
        } else {
            selectedMonthNum = 1; // Moharram
        }
    }
    selectedMonthNum = parseInt(selectedMonthNum);

    const monthSelect = document.getElementById('hijriMonthSelect');
    if (monthSelect) {
        monthSelect.value = selectedMonthNum.toString();
    }

    const hijriMonthsNames = [
        'محرم الحرام', 'صفر', 'ربيع الأول', 'ربيع الثاني',
        'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
        'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];

    if (prayerDb) {
        const days = Object.entries(prayerDb)
            .map(([gregDate, data]) => ({ gregDate, ...data }))
            .filter(d => d.hijri_month === selectedMonthNum && d.hijri_year === 1448)
            .sort((a, b) => a.hijri_day - b.hijri_day);

        if (days.length > 0) {
            const formatDateAr = (dateStr) => {
                const parts = dateStr.split('-');
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                const dayVal = d.getDate();
                const mName = new Intl.DateTimeFormat('ar-BH', { month: 'long' }).format(d);
                return `${dayVal} ${mName}`;
            };
            
            const getGregMonthYearAr = (daysList) => {
                const monthsYears = [];
                daysList.forEach(d => {
                    const parts = d.gregDate.split('-');
                    const dateObj = new Date(parts[0], parts[1]-1, parts[2]);
                    const mName = new Intl.DateTimeFormat('ar-BH', { month: 'long' }).format(dateObj);
                    const yr = parts[0];
                    const key = `${mName} ${yr}`;
                    if (!monthsYears.includes(key)) {
                        monthsYears.push(key);
                    }
                });
                return monthsYears.join(' - ');
            };

            const gregMonthYearText = getGregMonthYearAr(days);

            const printMonthHijriEl = document.getElementById('printMonthNameHijri');
            if (printMonthHijriEl) {
                printMonthHijriEl.textContent = `تقويم شهر ${hijriMonthsNames[selectedMonthNum - 1]} 1448هـ`;
            }

            const printHijriColHeader = document.getElementById('printHijriColHeader');
            const printGregColHeader = document.getElementById('printGregColHeader');
            if (printHijriColHeader) {
                printHijriColHeader.textContent = hijriMonthsNames[selectedMonthNum - 1].split(' ')[0];
            }
            if (printGregColHeader && days.length > 0) {
                const parts = days[0].gregDate.split('-');
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                const monthIdx = d.getMonth();
                const gregMonthsNamesAr = [
                    'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)',
                    'مايو (5)', 'يونيو (6)', 'يوليو (7)', 'أغسطس (8)',
                    'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
                ];
                printGregColHeader.textContent = gregMonthsNamesAr[monthIdx];
            }

            let screenHtml = '';
            let printHtml = '';
            let lastSeenMonth = null;

            days.forEach((day, idx) => {
                const parts = day.gregDate.split('-');
                const dateObj = new Date(parts[0], parts[1]-1, parts[2]);
                
                const isToday = (today.getFullYear() === dateObj.getFullYear() &&
                                 today.getMonth() === dateObj.getMonth() &&
                                 today.getDate() === dateObj.getDate());

                const rowBg = isToday ? "rgba(212, 175, 55, 0.15)" : (idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent");
                const textStyle = isToday ? "font-weight: bold; color: var(--gold-primary);" : "color: #ffffff;";

                const marriageLabels = {
                    '✓': '<span style="color: #2ecc71; font-weight: bold;">✓</span>',
                    '×': '<span style="color: #e74c3c; font-weight: bold;">×</span>',
                    '&': '<span style="color: #f1c40f; font-weight: bold;">&</span>'
                };
                const marriageSym = day.marriage || '';
                const marriageHtml = marriageLabels[marriageSym] || marriageSym;

                const imsak = day.imsak || (day.fajr ? subtractMinutesStr(day.fajr, 15) : '');
                const midnight = day.midnight || day.dhuhr || '';

                let occasionHtml = '';
                if (day.event) {
                    const isSad = ['وفاة', 'استشهاد', 'شهادة', 'هدم', 'عاشوراء'].some(k => day.event.includes(k));
                    const isHappy = ['ولادة', 'ميلاد', 'عيد', 'تنصيب', 'فرح'].some(k => day.event.includes(k));
                    if (isSad) {
                        occasionHtml = `<span style="font-size: 0.85rem; color: #ff6b6b; font-weight: bold;"><i class="fas fa-ribbon"></i> ${day.event}</span>`;
                    } else if (isHappy) {
                        occasionHtml = `<span style="font-size: 0.85rem; color: #2ecc71; font-weight: bold;"><i class="fas fa-heart"></i> ${day.event}</span>`;
                    } else {
                        occasionHtml = `<span style="font-size: 0.85rem; color: #bbb;">${day.event}</span>`;
                    }
                }

                screenHtml += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: ${rowBg}; ${textStyle} transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${rowBg}'">
                        <td style="padding: 12px 8px; border-left: 1px solid rgba(255,255,255,0.02);">${day.day_name_ar}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em; border-left: 1px solid rgba(255,255,255,0.02);">${formatDateAr(day.gregDate)}</td>
                        <td style="padding: 12px 8px; font-family: Tajawal; font-size: 1.05em; border-left: 1px solid rgba(255,255,255,0.02);">${day.hijri_day}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em; color: var(--gold-primary); font-weight: 500; border-left: 1px solid rgba(255,255,255,0.02);">${imsak}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em;">${day.fajr}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em;">${day.sunrise}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em;">${day.dhuhr}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em;">--</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em; color: var(--gold-primary); font-weight: 500;">${day.maghrib}</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em;">--</td>
                        <td style="padding: 12px 8px; font-family: monospace; font-size: 1.05em; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.02);">${midnight}</td>
                        <td style="padding: 12px 8px; border-right: 1px solid rgba(255,255,255,0.02);">${marriageHtml}</td>
                        <td style="padding: 12px 8px; text-align: right; padding-right: 15px; border-right: 1px solid rgba(255,255,255,0.02);">${occasionHtml}</td>
                    </tr>
                `;

                // Print row preparation
                const printRowBg = isToday ? "#e8f4fd" : (idx % 2 === 0 ? "#f9f9f9" : "#ffffff");
                const printMarriageText = day.marriage || '';
                
                let printOccasionHtml = day.event || '';
                if (day.event) {
                    const isSad = ['وفاة', 'استشهاد', 'شهادة', 'هدم', 'عاشوراء'].some(k => day.event.includes(k));
                    const isHappy = ['ولادة', 'ميلاد', 'عيد', 'تنصيب', 'فرح'].some(k => day.event.includes(k));
                    if (isSad) {
                        printOccasionHtml = `<span style="color: #c0392b; font-weight: bold;">${day.event}</span>`;
                    } else if (isHappy) {
                        printOccasionHtml = `<span style="color: #27ae60; font-weight: bold;">${day.event}</span>`;
                    }
                }

                // Gregorian day display text
                const currentMonthIdx = dateObj.getMonth();
                const dayNum = dateObj.getDate();
                let gregCellText = '';
                if (lastSeenMonth !== null && lastSeenMonth !== currentMonthIdx) {
                    const mShortName = new Intl.DateTimeFormat('ar-BH', { month: 'long' }).format(dateObj);
                    // Match formatting of screenshots (e.g. 1أغسطس) without spaces
                    gregCellText = `1${mShortName}`;
                } else {
                    gregCellText = dayNum.toString();
                }
                lastSeenMonth = currentMonthIdx;

                printHtml += `
                    <tr style="background: ${printRowBg}; border-bottom: 1px solid #000; height: 22px; font-weight: ${isToday ? 'bold' : 'normal'};">
                        <td style="border: 1px solid #000; padding: 2px 4px; font-weight: bold; font-size: 0.9rem;">${printMarriageText}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px;">${day.day_name_ar}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-family: monospace; font-size: 0.9rem;">${day.hijri_day}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-weight: bold;">${gregCellText}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-family: monospace;">${day.fajr}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-family: monospace;">${day.sunrise}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-family: monospace;">${day.dhuhr}</td>
                        <td style="border: 1px solid #000; padding: 2px 4px; font-family: monospace; font-weight: bold; color: #a0522d;">${day.maghrib}</td>
                        <td style="border: 1px solid #000; padding: 2px 6px; text-align: right; font-size: 0.74rem;">${printOccasionHtml}</td>
                    </tr>
                `;
            });

            tbody.innerHTML = screenHtml;
            if (printTbody) {
                printTbody.innerHTML = printHtml;
            }
            return;
        }
    }

    if (typeof adhan === 'undefined') return;
    const coordinates = new adhan.Coordinates(currentCoordinates.latitude, currentCoordinates.longitude);
    const params = adhan.CalculationMethod.Tehran();
    params.madhab = adhan.Madhab.Shafi; 
    params.adjustments.maghrib = 15; 
    params.timezone = 3;
    const offset = parseInt(localStorage.getItem('hijri_offset') || '0');
    let hiddenPrayers = [];
    try {
        if (settings.hidden_prayers) hiddenPrayers = settings.hidden_prayers;
    } catch(e) {}

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let html = '';
    const timeFormat = (t) => {
        let hours = t.getHours();
        const minutes = t.getMinutes().toString().padStart(2, '0');
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${minutes}`;
    };

    for (let i = 1; i <= endOfMonth.getDate(); i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const times = new adhan.PrayerTimes(coordinates, date, params);
        const isToday = (i === today.getDate());
        const rowBg = isToday ? "rgba(212, 175, 55, 0.1)" : (i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent");
        const textStyle = isToday ? "font-weight: bold; color: var(--gold-primary);" : "color: #ffffff;";
        const dayName = new Intl.DateTimeFormat('ar-BH', { weekday: 'long' }).format(date);
        const gDay = date.getDate();
        let hDay = "";
        try {
            const hInfo = adhan.getHijriDate(date, offset);
            hDay = hInfo ? hInfo.day : "--";
        } catch(e) { hDay = "--"; }
        const imsakTime = new Date(times.fajr.getTime() - 15 * 60000);
        let midnightTime = times.midnight;
        if (!midnightTime) {
            const tomorrow = new Date(date.getTime() + 86400000);
            const tomorrowTimes = new adhan.PrayerTimes(coordinates, tomorrow, params);
            midnightTime = new Date(times.maghrib.getTime() + (tomorrowTimes.fajr.getTime() - times.maghrib.getTime()) / 2);
        }
        
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: ${rowBg}; ${textStyle}">
                <td style="padding: 12px 8px;">${dayName}</td>
                <td style="padding: 12px 8px;">${gDay}</td>
                <td style="padding: 12px 8px;">${hDay}</td>
                <td style="padding: 12px 8px; color: var(--gold-primary);">${timeFormat(imsakTime)}</td>
                <td style="padding: 12px 8px;">${timeFormat(times.fajr)}</td>
                <td style="padding: 12px 8px;">${timeFormat(times.sunrise)}</td>
                <td style="padding: 12px 8px;">${timeFormat(times.dhuhr)}</td>
                <td style="padding: 12px 8px;">--</td>
                <td style="padding: 12px 8px; color: var(--gold-primary);">${timeFormat(times.maghrib)}</td>
                <td style="padding: 12px 8px;">--</td>
                <td style="padding: 12px 8px; color: #94a3b8;">${timeFormat(midnightTime)}</td>
                <td style="padding: 12px 8px;">--</td>
                <td style="padding: 12px 8px; text-align: right;">--</td>
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
