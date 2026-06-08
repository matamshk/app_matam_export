
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
    const offset = parseInt(localStorage.getItem('hijri_offset') || '0');

    // Settings
    let hiddenPrayers = [];
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        if (settings.hidden_prayers) hiddenPrayers = settings.hidden_prayers;
    } catch(e) {}

    let html = '';

    // Hide headers dynamically based on setting
    const headerRow = document.querySelector('#printCalendarArea thead tr');
    if (headerRow && headerRow.children.length > 0) {
        // Assume order: Day, Greg, Hijri, Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Midnight
        if (headerRow.children[3]) headerRow.children[3].style.display = hiddenPrayers.includes('imsak') ? 'none' : '';
        if (headerRow.children[4]) headerRow.children[4].style.display = hiddenPrayers.includes('fajr') ? 'none' : '';
        if (headerRow.children[5]) headerRow.children[5].style.display = hiddenPrayers.includes('sunrise') ? 'none' : '';
        if (headerRow.children[6]) headerRow.children[6].style.display = hiddenPrayers.includes('dhuhr') ? 'none' : '';
        if (headerRow.children[7]) headerRow.children[7].style.display = hiddenPrayers.includes('asr') ? 'none' : '';
        if (headerRow.children[8]) headerRow.children[8].style.display = hiddenPrayers.includes('maghrib') ? 'none' : '';
        if (headerRow.children[9]) headerRow.children[9].style.display = hiddenPrayers.includes('isha') ? 'none' : '';
        if (headerRow.children[10]) headerRow.children[10].style.display = hiddenPrayers.includes('midnight') ? 'none' : '';
    }

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
        let hDay = "";
        try {
            const hInfo = adhan.getHijriDate(date, offset);
            hDay = hInfo ? hInfo.day : "--";
        } catch(e) {
            hDay = "--";
        }
        
        // 4. Imsak (Typically 15 minutes before Fajr)
        const imsakTime = new Date(times.fajr.getTime() - 15 * 60000);
        
        // 5. Midnight (Halfway between Sunset/Maghrib and Tomorrow's Fajr)
        let midnightTime = times.midnight;
        if (!midnightTime) {
            const tomorrow = new Date(date.getTime() + 86400000);
            const tomorrowTimes = new adhan.PrayerTimes(coordinates, tomorrow, params);
            midnightTime = new Date(times.maghrib.getTime() + (tomorrowTimes.fajr.getTime() - times.maghrib.getTime()) / 2);
        }
        
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: ${rowBg}; ${textStyle} transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='${rowBg}'">
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; border-left: 1px solid rgba(255,255,255,0.02);">${dayName}</td>
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; font-family: monospace; font-size: 1.1em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'}; border-left: 1px solid rgba(255,255,255,0.02);">${gDay}</td>
                <td style="padding: 14px 8px; font-weight: ${isToday ? 'bold' : 'normal'}; font-family: Tajawal; font-size: 1.1em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'}; border-left: 1px solid rgba(255,255,255,0.02);">${hDay}</td>
                
                ${!hiddenPrayers.includes('imsak') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: var(--gold-primary); font-weight: 500; border-left: 1px solid rgba(255,255,255,0.02);">${timeFormat(imsakTime)}</td>` : ''}
                ${!hiddenPrayers.includes('fajr') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.fajr)}</td>` : ''}
                ${!hiddenPrayers.includes('sunrise') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.sunrise)}</td>` : ''}
                ${!hiddenPrayers.includes('dhuhr') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.dhuhr)}</td>` : ''}
                ${!hiddenPrayers.includes('asr') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.asr)}</td>` : ''}
                ${!hiddenPrayers.includes('maghrib') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: ${isToday ? 'var(--gold-primary)' : '#ffffff'};">${timeFormat(times.maghrib)}</td>` : ''}
                ${!hiddenPrayers.includes('isha') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff;">${timeFormat(times.isha)}</td>` : ''}
                ${!hiddenPrayers.includes('midnight') ? `<td style="padding: 14px 8px; font-family: monospace; font-size: 1.05em; color: #ffffff; border-right: 1px solid rgba(255,255,255,0.02);">${timeFormat(midnightTime)}</td>` : ''}
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
