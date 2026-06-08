/**
 * Event Management System - Main Logic
 */

// --- Authentication Guard ---
(function() {
    const path = window.location.pathname;
    const isLogin = path.endsWith('login.html');
    const token = localStorage.getItem('admin_token');
    
    // If not logged in and not on login page, redirect to login
    if (!isLogin && !token) {
        window.location.replace('login.html');
    }
    
    // If logged in and on login page, redirect to main page
    if (isLogin && token) {
        window.location.replace('index.html');
    }
})();

// Navigation
const pages = [
    { name: 'الرئيسية', url: 'index.html' },
    { name: 'حجز مأتم', url: 'booking-matem.html' },
    { name: 'حجز خطيب', url: 'booking-speaker.html' },
    { name: 'احتفالات', url: 'celebrations.html' },
    { name: 'دليل المناسبات', url: 'occasions.html' },
    { name: 'أوقات الصلاة', url: 'awqaf.html' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sync data from server
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            const db = await res.json();
            if (db.bookings) localStorage.setItem('matam_bookings', JSON.stringify(db.bookings));
            if (db.custom_occasions) localStorage.setItem('custom_occasions', JSON.stringify(db.custom_occasions));
            if (db.hijri_offset !== undefined) {
                localStorage.setItem('hijri_offset', JSON.stringify(db.hijri_offset));
                if (typeof hijriOffset !== 'undefined') hijriOffset = parseInt(db.hijri_offset);
            }
            if (db.settings) {
                localStorage.setItem('site_settings', JSON.stringify(db.settings));
                if (typeof updatePrayerReferenceButton === 'function') {
                    updatePrayerReferenceButton();
                }
            }
        }
    } catch (e) {
        console.warn("Server API not available, using local data only.");
    }

    initNavbar();
    initWhatsApp();

    // Page specific initializations
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
        renderDashboard();
    } else if (path.includes('booking') || path.includes('celebrations')) {
        initBookingForm();
    } else if (path.includes('occasions')) {
        // Fix: Call initOccasionsPage if available
        if (typeof initOccasionsPage === 'function') {
            initOccasionsPage();
        } else if (typeof renderOccasions === 'function') {
            renderOccasions();
        }
    }
});

function initNavbar() {
    const navContainer = document.querySelector('.nav-links');
    if (!navContainer) return;

    // Clear existing for idempotency during dev
    navContainer.innerHTML = '';

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Enhance pages with Icons
    const pagesWithIcons = [
        { name: 'الرئيسية', url: 'index.html', icon: 'fa-home' },
        { name: 'حجز مأتم', url: 'booking-matem.html', icon: 'fa-kaaba' },
        { name: 'حجز خطيب', url: 'booking-speaker.html', icon: 'fa-microphone-alt' },
        { name: 'احتفالات', url: 'celebrations.html', icon: 'fa-star' },
        { name: 'المناسبات', url: 'occasions.html', icon: 'fa-calendar-alt' },
        { name: 'مساهمة المرحومين', url: 'contribution.html', icon: 'fa-hand-holding-heart' },
        { name: 'أوقات الصلاة', url: 'awqaf.html', icon: 'fa-clock' },
        { name: 'لوحة الإدارة', url: 'dashboard.html', icon: 'fa-cogs' },
        { name: 'تسجيل الخروج', url: '#', icon: 'fa-sign-out-alt', isLogout: true }
    ];

    let hiddenPages = [];
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        if (settings.hidden_pages) hiddenPages = settings.hidden_pages;
    } catch(e) {}

    // 1. Render Top Nav (Desktop)
    pagesWithIcons.forEach(page => {
        // Skip hidden pages
        if (hiddenPages.includes(page.url)) return;

        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = page.url;
        
        if (page.isLogout) {
            a.innerHTML = `<i class="fas ${page.icon}"></i> ${page.name}`;
            a.style.background = 'rgba(220, 53, 69, 0.15)'; // Red tint for logout
            a.style.color = '#ff6b6b';
            a.style.padding = '8px 15px';
            a.style.borderRadius = '20px';
            a.style.border = '1px solid #ff6b6b';
            a.style.fontWeight = 'bold';
            a.style.display = 'flex';
            a.style.alignItems = 'center';
            a.style.gap = '8px';
            a.style.marginLeft = '10px';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('admin_token');
                window.location.replace('login.html');
            });
        } else {
            a.textContent = page.name;
            if (page.url === currentPath) a.classList.add('active');
        }
        
        li.appendChild(a);
        navContainer.appendChild(li);
    });

    // 2. Render Bottom Nav (Mobile) - Inject if not exists
    let bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) {
        bottomNav = document.createElement('nav');
        bottomNav.className = 'bottom-nav';
        document.body.appendChild(bottomNav);
    }

    bottomNav.innerHTML = pagesWithIcons.filter(p => !hiddenPages.includes(p.url)).map(page => `
        <a href="${page.url}" class="nav-item ${page.url === currentPath ? 'active' : ''}" ${page.isLogout ? 'onclick="localStorage.removeItem(\'admin_token\'); window.location.replace(\'login.html\');"' : ''}>
            <i class="fas ${page.icon}" ${page.isLogout ? 'style="color:#ff6b6b;"' : ''}></i>
            <span ${page.isLogout ? 'style="color:#ff6b6b;"' : ''}>${page.name}</span>
        </a>
    `).join('');

    // Hide services cards if on home page
    if (currentPath === 'index.html' || currentPath === '') {
        hiddenPages.forEach(url => {
            const card = document.querySelector(`.service-card[href="${url}"]`);
            if (card) card.style.display = 'none';
        });
    }
}

function initWhatsApp() {
    const float = document.getElementById('whatsapp-float');
    if (!float) return;

    // Default message
    let msg = 'سلام عليكم، أود الاستفسار عن خدمات المأتم.';

    // Dynamic message based on page or latest booking
    const bookings = getBookings();
    if (bookings.length > 0) {
        const last = bookings[0]; // Most recent
        msg = `سلام عليكم، بخصوص الحجز بتاريخ ${last.date} (${last.type})`;
    }

    let phone = '97300000000'; // Default
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        if (settings.whatsapp_phone) phone = settings.whatsapp_phone;
    } catch(e) {}
    
    // Make sure we use target="_blank" rel="noopener noreferrer" for safety
    float.target = "_blank";
    float.rel = "noopener noreferrer";
    float.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// Storage Utilities
function getBookings() {
    const data = localStorage.getItem('matam_bookings');
    return data ? JSON.parse(data) : [];
}

function saveBooking(booking) {
    const bookings = getBookings();
    bookings.unshift(booking); // Add to top
    localStorage.setItem('matam_bookings', JSON.stringify(bookings));

    // Sync to server silently
    fetch('/api/save_booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
    }).catch(e => console.error("Could not sync booking to server", e));
}

// --- Date Collision & Conflict Checking ---

function getHijriDateOfGregorian(gregDate) {
    const offsetDate = new Date(gregDate.getTime() + hijriOffset * 86400000);
    let hMonth = 0;
    let hDay = 0;
    try {
        const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' });
        const hParts = formatter.formatToParts(offsetDate);
        const hm = hParts.find(p => p.type === 'month');
        const hd = hParts.find(p => p.type === 'day');
        if (hm) hMonth = parseInt(hm.value);
        if (hd) hDay = parseInt(hd.value);
    } catch(e) {
        console.warn("Intl Hijri formatting failed");
    }
    return { month: hMonth, day: hDay };
}

function checkDateConflict(dateStr) {
    if (!dateStr) return null;
    
    // 1. Check bookings collision
    const bookings = getBookings();
    const bookingConflict = bookings.find(b => b.date === dateStr);
    
    // 2. Check occasions collision
    const dateObj = new Date(dateStr);
    const { month: hMonth, day: hDay } = getHijriDateOfGregorian(dateObj);
    
    let occasionConflict = null;
    const isCelebration = window.location.pathname.includes('celebrations');
    
    if (hMonth > 0 && hDay > 0) {
        const occasions = (typeof getCombinedEvents === 'function') ? getCombinedEvents(hMonth) : [];
        const dayOccasions = occasions.filter(e => e.hijri.day === hDay);
        
        if (isCelebration) {
            // Celebrations conflict with any religious, happy, or sad occasion
            occasionConflict = dayOccasions[0] || null;
        } else {
            // Mourning (matam) and speaker bookings only conflict with sad occasions
            occasionConflict = dayOccasions.find(e => e.type === 'sad') || null;
        }
    }
    
    if (bookingConflict || occasionConflict) {
        return {
            date: dateStr,
            booking: bookingConflict,
            occasion: occasionConflict,
            isCelebration: isCelebration
        };
    }
    
    return null;
}

function findAlternativeDates(baseDateStr, isCelebration) {
    const alternatives = [];
    const baseDate = new Date(baseDateStr);
    let checkDate = new Date(baseDate.getTime());
    
    // Check up to 60 days ahead
    for (let i = 1; i <= 60; i++) {
        checkDate.setDate(checkDate.getDate() + 1);
        const checkStr = checkDate.toISOString().split('T')[0];
        
        // Check booking conflict
        const bookings = getBookings();
        const hasBooking = bookings.some(b => b.date === checkStr);
        if (hasBooking) continue;
        
        // Check occasion conflict
        const { month: hMonth, day: hDay } = getHijriDateOfGregorian(checkDate);
        if (hMonth > 0 && hDay > 0) {
            const occasions = (typeof getCombinedEvents === 'function') ? getCombinedEvents(hMonth) : [];
            const dayOccasions = occasions.filter(e => e.hijri.day === hDay);
            
            if (isCelebration) {
                if (dayOccasions.length > 0) continue;
            } else {
                const hasSad = dayOccasions.some(e => e.type === 'sad');
                if (hasSad) continue;
            }
        }
        
        alternatives.push(new Date(checkDate.getTime()));
        if (alternatives.length === 3) break;
    }
    return alternatives;
}

function formatDateArabic(dateObj) {
    const gPart = new Intl.DateTimeFormat('ar-BH', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
    let hPart = "";
    try {
        const offsetDate = new Date(dateObj.getTime() + hijriOffset * 86400000);
        hPart = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', calendar: 'islamic-umalqura' }).format(offsetDate);
    } catch(e) {}
    return `${gPart} (${hPart})`;
}

function showConflictModal(conflict, callback) {
    // Remove existing if any
    const existing = document.getElementById('bookingConflictModal');
    if (existing) existing.remove();
    
    // Format selected date
    const selectedDateObj = new Date(conflict.date);
    const selectedDateFormatted = formatDateArabic(selectedDateObj);
    
    // Build conflict message HTML
    let messageHtml = `<p style="margin: 0 0 10px 0; font-size: 1.05rem; color: #fff;">التاريخ المحدد: <strong>${selectedDateFormatted}</strong></p>`;
    
    if (conflict.booking) {
        messageHtml += `<div style="background: rgba(220, 53, 69, 0.15); border-right: 4px solid #dc3545; padding: 10px 15px; margin-bottom: 10px; border-radius: 4px; color: #ff8787;">
            <i class="fas fa-calendar-times"></i> يوجد حجز مسبق مسجل في هذا التاريخ باسم: <strong>${conflict.booking.name}</strong> (${conflict.booking.type.replace('بوابة المأتم - ', '')})
        </div>`;
    }
    
    if (conflict.occasion) {
        let occTypeStr = "مناسبة عامة";
        let occColor = "#f1c40f";
        let occBg = "rgba(241, 196, 15, 0.15)";
        if (conflict.occasion.type === 'sad') {
            occTypeStr = "مناسبة حزينة (عزاء/وفاة)";
            occColor = "#dc3545";
            occBg = "rgba(220, 53, 69, 0.15)";
        } else if (conflict.occasion.type === 'happy') {
            occTypeStr = "مناسبة سعيدة (مولد/عيد)";
            occColor = "#28a745";
            occBg = "rgba(40, 167, 69, 0.15)";
        }
        
        messageHtml += `<div style="background: ${occBg}; border-right: 4px solid ${occColor}; padding: 10px 15px; border-radius: 4px; color: #fff;">
            <i class="fas fa-info-circle" style="color: ${occColor};"></i> يتزامن هذا التاريخ مع: <strong>${conflict.occasion.title}</strong> (${occTypeStr})
        </div>`;
    }
    
    // Suggestions
    const alternatives = findAlternativeDates(conflict.date, conflict.isCelebration);
    let suggestionsHtml = "";
    if (alternatives.length > 0) {
        suggestionsHtml = alternatives.map(altDate => {
            const altStr = altDate.toISOString().split('T')[0];
            const altFormatted = formatDateArabic(altDate);
            return `<button class="suggested-date-btn" data-date="${altStr}">
                <span><i class="far fa-calendar-check" style="color: var(--gold-primary, #d4af37);"></i> ${altFormatted}</span>
                <i class="fas fa-chevron-left" style="font-size: 0.8rem; opacity: 0.6;"></i>
            </button>`;
        }).join('');
    } else {
        suggestionsHtml = `<p style="color: #888; font-size: 0.9rem; text-align: center; margin: 10px 0;">لا توجد تواريخ بديلة مقترحة حالياً.</p>`;
    }
    
    const modalHtml = `
    <div id="bookingConflictModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(8px);">
        <style>
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.08); box-shadow: 0 0 15px rgba(220, 53, 69, 0.5); }
                100% { transform: scale(1); }
            }
            .suggested-date-btn {
                background: rgba(255,255,255,0.03) !important;
                color: #fff !important;
                border: 1px solid rgba(212,175,55,0.2) !important;
                padding: 12px 15px !important;
                border-radius: 8px !important;
                text-align: right !important;
                cursor: pointer !important;
                font-family: 'Tajawal', sans-serif !important;
                font-weight: 500 !important;
                transition: all 0.3s ease !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                width: 100% !important;
                margin-bottom: 8px !important;
            }
            .suggested-date-btn:hover {
                background: rgba(212,175,55,0.1) !important;
                border-color: var(--gold-primary, #d4af37) !important;
                transform: translateX(-5px) !important;
            }
        </style>
        <div style="background: #111111; color: #fff; border-radius: 16px; padding: 30px; width: 100%; max-width: 550px; text-align: center; border: 2px solid var(--gold-primary, #d4af37); box-shadow: 0 10px 30px rgba(0,0,0,0.8); max-height: 95vh; overflow-y: auto; direction: rtl; font-family: 'Tajawal', sans-serif;">
            <div style="width: 70px; height: 70px; background: rgba(220, 53, 69, 0.1); color: #dc3545; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 15px; animation: pulse 2s infinite;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style="color: var(--gold-primary, #d4af37); margin-bottom: 15px; font-weight: bold; font-size: 1.4rem;">تنبيه بوجود تعارض!</h3>
            
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: right;">
                ${messageHtml}
            </div>
            
            <div style="text-align: right; margin-bottom: 20px;">
                <h4 style="color: var(--gold-primary, #d4af37); margin-bottom: 12px; font-size: 0.95rem; font-weight: bold;"><i class="fas fa-calendar-alt"></i> التواريخ البديلة المقترحة (المتاحة):</h4>
                <div style="display: flex; flex-direction: column;">
                    ${suggestionsHtml}
                </div>
            </div>

            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
                <button id="btnOverrideBooking" style="flex: 1; background: #dc3545; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 0.95rem; transition: background 0.3s; min-width: 150px;">
                    تجاوز وإتمام الحجز
                </button>
                <button id="btnCancelBooking" style="flex: 1; background: #444; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 0.95rem; transition: background 0.3s; min-width: 150px;">
                    اختيار تاريخ آخر
                </button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Event listeners
    const modal = document.getElementById('bookingConflictModal');
    
    modal.querySelectorAll('.suggested-date-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chosenDate = btn.getAttribute('data-date');
            modal.remove();
            callback(chosenDate);
        });
    });
    
    document.getElementById('btnOverrideBooking').addEventListener('click', () => {
        modal.remove();
        callback('override');
    });
    
    document.getElementById('btnCancelBooking').addEventListener('click', () => {
        modal.remove();
        callback('change');
    });
}

// Form Handling
function initBookingForm() {
    const form = document.querySelector('form');
    if (!form) return;

    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            const val = dateInput.value;
            if (val) {
                const conflict = checkDateConflict(val);
                if (conflict) {
                    showConflictModal(conflict, (choice) => {
                        if (choice === 'override') {
                            dateInput.dataset.override = 'true';
                        } else if (choice === 'change') {
                            dateInput.value = '';
                            delete dateInput.dataset.override;
                        } else {
                            dateInput.value = choice;
                            delete dateInput.dataset.override;
                        }
                    });
                } else {
                    delete dateInput.dataset.override;
                }
            }
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simple Validation
        if (!form.checkValidity()) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        // Final Conflict Check before submit if not overridden
        if (dateInput && dateInput.value && dateInput.dataset.override !== 'true') {
            const conflict = checkDateConflict(dateInput.value);
            if (conflict) {
                showConflictModal(conflict, (choice) => {
                    if (choice === 'override') {
                        dateInput.dataset.override = 'true';
                        const submitBtn = form.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                        } else {
                            form.dispatchEvent(new Event('submit'));
                        }
                    } else if (choice === 'change') {
                        dateInput.value = '';
                        delete dateInput.dataset.override;
                    } else {
                        dateInput.value = choice;
                        delete dateInput.dataset.override;
                    }
                });
                return;
            }
        }

        const formData = new FormData(form);
        const booking = {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            type: document.title, // Use page title as type or specific hidden field
            details: {}
        };

        // Extract File Name if present (fake upload for localStorage)
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
            booking.reportName = fileInput.files[0].name;
        }

        for (let [key, value] of formData.entries()) {
            if (key !== 'report') { // Skip actual file object
                // Handle multiple values for the same key (e.g., checkboxes)
                if (booking.details[key]) {
                    if (!Array.isArray(booking.details[key])) {
                        booking.details[key] = [booking.details[key]];
                    }
                    booking.details[key].push(value);
                } else {
                    booking.details[key] = value;
                }
            }
        }

        // Generic field mapping for dashboard
        booking.date = formData.get('date');
        booking.name = formData.get('name');
        booking.phone = formData.get('phone');

        saveBooking(booking);
        
        // Show personalized Success Modal instead of generic alert
        showSuccessModal(booking);
    });
}

function showSuccessModal(booking) {
    // Build HTML summary list
    let summaryList = `<ul style="text-align: right; padding-right: 20px; color: var(--text-dark, #222); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.8;">`;
    summaryList += `<li><strong>تاريخ الحجز:</strong> ${booking.date}</li>`;
    if(booking.details.time) summaryList += `<li><strong>الوقت/الفترة:</strong> ${booking.details.time}</li>`;
    if(booking.details.period) summaryList += `<li><strong>الفترة:</strong> ${booking.details.period}</li>`;
    if(booking.details.time_specific) summaryList += `<li><strong>الوقت المحدد:</strong> ${booking.details.time_specific}</li>`;
    
    if(booking.details.service) summaryList += `<li><strong>المناسبة/الخدمة:</strong> ${booking.details.service}</li>`;
    else if(booking.details.event_type) summaryList += `<li><strong>نوع الفعالية:</strong> ${booking.details.event_type}</li>`;
    
    if(booking.details.hall) summaryList += `<li><strong>الموقع:</strong> ${booking.details.hall}</li>`;
    else if(booking.details.hall_details) summaryList += `<li><strong>الموقع:</strong> ${booking.details.hall_details}</li>`;
    
    if(booking.details.package) summaryList += `<li><strong>الباقة المختارة:</strong> ${booking.details.package}</li>`;
    
    // Celebration Participants
    if(booking.details.participant_khatib && booking.details.participant_khatib.trim()) summaryList += `<li><strong>الخطيب:</strong> ${booking.details.participant_khatib}</li>`;
    if(booking.details.participant_quran && booking.details.participant_quran.trim()) summaryList += `<li><strong>قارئ القرآن:</strong> ${booking.details.participant_quran}</li>`;
    if(booking.details.participant_speech && booking.details.participant_speech.trim()) summaryList += `<li><strong>الكلمة:</strong> ${booking.details.participant_speech}</li>`;
    if(booking.details.participant_poet && booking.details.participant_poet.trim()) summaryList += `<li><strong>الشعر:</strong> ${booking.details.participant_poet}</li>`;
    if(booking.details.participant_radod && booking.details.participant_radod.trim()) summaryList += `<li><strong>الأهازيج/الرادود:</strong> ${booking.details.participant_radod}</li>`;
    if(booking.details.participant_intro && booking.details.participant_intro.trim()) summaryList += `<li><strong>عريف الحفل:</strong> ${booking.details.participant_intro}</li>`;

    // Add-ons array
    let addons = [];
    if(booking.details.has_tables) addons.push(`${booking.details.tables_count || ''} طاولات`);
    if(booking.details.has_chairs) addons.push(`${booking.details.chairs_count || ''} كراسي`);
    if(booking.details.has_tea) addons.push(`شاي`);
    if(booking.details.has_coffee) addons.push(`قهوة`);
    
    if(booking.details.services) {
        let maps = { 'cleaning': 'تنظيف', 'stage': 'مسرح', 'food': 'طعام' };
        if(Array.isArray(booking.details.services)) {
            addons.push(...booking.details.services.map(s => maps[s] || s));
        } else {
            addons.push(maps[booking.details.services] || booking.details.services);
        }
    }

    if(booking.details.other_services) addons.push(`خدمات إضافية مسجلة`);
    
    if(addons.length > 0) summaryList += `<li><strong>الإضافات:</strong> ${addons.join(' + ')}</li>`;
    summaryList += `</ul>`;

    // Plain text block for WhatsApp / Email
    let plainSummary = `السلام عليكم\nهذا النظام الذكي لحجز المواعيد الخاص بـ "مأتم أبو صيبع الشرقي"، سيتم التواصل معكم لتأكيد الحجز.\n\n`;
    plainSummary += `مرحباً ${booking.name}،\nشكراً لاختيارك خدمات المأتم.\n\nتفاصيل الحجز المسجلة:\n`;
    plainSummary += `- التاريخ: ${booking.date}\n`;
    if(booking.details.time) plainSummary += `- الوقت/الفترة: ${booking.details.time}\n`;
    if(booking.details.period) plainSummary += `- الفترة: ${booking.details.period}\n`;
    if(booking.details.time_specific) plainSummary += `- الوقت المحدد: ${booking.details.time_specific}\n`;
    
    if(booking.details.service) plainSummary += `- المناسبة: ${booking.details.service}\n`;
    else if(booking.details.event_type) plainSummary += `- المناسبة: ${booking.details.event_type}\n`;
    
    if(booking.details.hall) plainSummary += `- الموقع: ${booking.details.hall}\n`;
    else if(booking.details.hall_details) plainSummary += `- الموقع: ${booking.details.hall_details}\n`;
    
    if(booking.details.package) plainSummary += `- الباقة: ${booking.details.package}\n`;
    
    if(booking.details.participant_khatib && booking.details.participant_khatib.trim()) plainSummary += `- الخطيب: ${booking.details.participant_khatib}\n`;
    if(booking.details.participant_quran && booking.details.participant_quran.trim()) plainSummary += `- قارئ القرآن: ${booking.details.participant_quran}\n`;
    if(booking.details.participant_speech && booking.details.participant_speech.trim()) plainSummary += `- الكلمة: ${booking.details.participant_speech}\n`;
    if(booking.details.participant_poet && booking.details.participant_poet.trim()) plainSummary += `- الشعر: ${booking.details.participant_poet}\n`;
    if(booking.details.participant_radod && booking.details.participant_radod.trim()) plainSummary += `- الأهازيج/الرادود: ${booking.details.participant_radod}\n`;
    if(booking.details.participant_intro && booking.details.participant_intro.trim()) plainSummary += `- عريف الحفل: ${booking.details.participant_intro}\n`;

    if(addons.length > 0) plainSummary += `- الإضافات المرافقة: ${addons.join(' + ')}\n`;
    if(booking.details.other_services) plainSummary += `- الملاحظات الإضافية: ${booking.details.other_services}\n`;
    plainSummary += `\nنسألكم الدعاء!`;

    const waLink = "https://wa.me/?text=" + encodeURIComponent(plainSummary);
    const emailLink = "mailto:?subject=" + encodeURIComponent("تأكيد تفاصيل الحجز - مأتم أبو صيبع الشرقي") + "&body=" + encodeURIComponent(plainSummary);

    const modalHtml = `
    <div id="bookingSuccessModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; justify-content: center; align-items: center; padding: 20px;">
        <div style="background: white; border-radius: 16px; padding: 30px; width: 100%; max-width: 500px; text-align: center; border: 2px solid var(--gold-primary); box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; max-height: 90vh; overflow-y: auto;">
            <div style="width: 80px; height: 80px; background: rgba(40, 167, 69, 0.1); color: #28a745; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 15px;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 style="color: var(--gold-primary); margin-bottom: 5px;">السلام عليكم يا ${booking.name}</h2>
            <p style="color: #666; font-size: 0.95rem; margin-bottom: 20px;">هذا النظام الذكي لحجز المواعيد الخاص بـ <strong>مأتم أبو صيبع الشرقي</strong>، سيتم التواصل معكم لتأكيد الحجز.</p>
            
            <div style="background: #fdfcf8; border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 15px; margin-bottom: 25px; text-align: right;">
                <h4 style="color: #333; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">ملخص المتفق عليه:</h4>
                ${summaryList}
            </div>

            <p style="color: #444; font-size: 0.9rem; margin-bottom: 15px;">قم بإرسال وإرساء نسخة من التأكيد إلى حسابك؟</p>

            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <a href="${waLink}" target="_blank" rel="noopener noreferrer" onclick="finishBooking()" style="flex: 1; background: #25d366; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; min-width: 140px; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2);">
                    <i class="fab fa-whatsapp"></i> إرسال واتساب
                </a>
                <a href="${emailLink}" target="_blank" rel="noopener noreferrer" onclick="finishBooking()" style="flex: 1; background: #007bff; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; min-width: 140px; box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2);">
                    <i class="fas fa-envelope"></i> إرسال للإيميل
                </a>
            </div>

            <button onclick="finishBooking()" style="background: transparent; border: none; color: #888; text-decoration: underline; cursor: pointer; font-size: 0.9rem;">تخطي والعودة للرئيسية</button>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Global scope for HTML onclick access
window.finishBooking = function() {
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500); // 500ms delay gives browser time to pop-up external links safely
};

function renderDashboard() {
    // 1. Render Prayer Times Widget
    if (typeof adhan !== 'undefined') {
        renderHomePrayerTimes();
    }

    // 2. Render Occasions Widget
    if (typeof hijriMonths !== 'undefined' && typeof getEventsByMonth !== 'undefined') {
        renderHomeOccasions();
    }

    renderNextMonthOccasions();

    const list = document.querySelector('.bookings-list');
    // ... rest for bookings list

    if (!list) return;

    const bookings = getBookings();

    if (bookings.length === 0) {
        list.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 2rem; color: #888;">لا توجد حجوزات حالياً.</p>';
        return;
    }

    list.innerHTML = bookings.map(b => `
        <div class="booking-item" style="background: #fdfcf8; padding: 15px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <div class="booking-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 8px; margin-bottom: 8px;">
                <span class="booking-date" style="font-weight: bold; color: var(--gold-primary); font-size: 0.9em;"><i class="fas fa-calendar-day"></i> ${b.date}</span>
                <span class="status-badge" style="background: rgba(212,175,55,0.15); padding: 4px 10px; border-radius: 20px; font-size: 0.75em; color: var(--text-gold); font-weight: bold;">${b.type.replace('بوابة المأتم - ', '')}</span>
            </div>
            <div class="booking-details" style="font-size: 0.85em; line-height: 1.6; color: var(--text-dark);">
                <p style="margin: 0; margin-bottom: 3px;"><strong>الاسم:</strong> ${b.name}</p>
                <p style="margin: 0; margin-bottom: 3px;"><strong>المناسبة/الخدمة:</strong> ${b.details.service || b.details.occasion || b.type}</p>
                ${b.details.time ? `<p style="margin: 0;"><strong>الوقت:</strong> ${b.details.time}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function renderOccasions() {
    const grid = document.getElementById('occasions-container');
    if (!grid) return;

    // Use the hijriMonths array defined in occasions-data.js
    let html = `<h3 class="text-center" style="color:var(--primary-color); margin-bottom: 20px;">عام ${typeof currentHijriYear !== 'undefined' ? currentHijriYear : ''} هـ</h3>`;

    // Check if variables exist
    if (typeof hijriMonths === 'undefined' || typeof getEventsByMonth === 'undefined') {
        grid.innerHTML = '<div class="text-center">بيانات المناسبات غير متوفرة.</div>';
        return;
    }

    hijriMonths.forEach((monthName, index) => {
        const monthIndex = index + 1; // 1-based index
        // Use getCombinedEvents to include custom events
        const events = (typeof getCombinedEvents === 'function')
            ? getCombinedEvents(monthIndex)
            : getEventsByMonth(monthIndex);

        if (events.length > 0) {
            html += `
                <div class="month-group">
                    <h3 class="month-title">${monthName}</h3>
                    <div class="occasions-grid">
                        ${events.map(e => {
                            let targetUrl = '#'; // custom events or neutral
                            if (e.type === 'sad') targetUrl = `booking-speaker.html?type=sad&occ=${encodeURIComponent(e.title)}`;
                            else if (e.type === 'happy') targetUrl = `celebrations.html?type=happy&occ=${encodeURIComponent(e.title)}`;
                            
                            // Get date object
                            let gDateObj = getGregorianDateObj(currentHijriYear, e.hijri.month, e.hijri.day);
                            let gDateStr = new Intl.DateTimeFormat('ar-BH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(gDateObj);
                            
                            // Calculate Maghrib Time
                            let maghribTimeStr = "--:--";
                            if (typeof adhan !== 'undefined') {
                                const coords = new adhan.Coordinates(26.2285, 50.5860);
                                const params = adhan.CalculationMethod.Tehran();
                                params.madhab = adhan.Madhab.Shafi;
                                params.adjustments.maghrib = 15;
                                params.timezone = 3;
                                const pTimes = new adhan.PrayerTimes(coords, gDateObj, params);
                                let mt = pTimes.maghrib;
                                let h = mt.getHours() % 12 || 12;
                                let m = mt.getMinutes().toString().padStart(2, '0');
                                maghribTimeStr = `${h}:${m}`;
                            }
                            
                            return `
                            <a href="${targetUrl}" style="text-decoration: none; color: inherit; display: block;">
                                <div class="occasion-card ${e.type || ''}" style="cursor: pointer; position: relative;">
                                    <div class="occasion-day">${e.hijri.day}</div>
                                    <div class="occasion-content">
                                        <div class="occasion-name">${e.title}</div>
                                        <div class="occasion-desc" style="font-size: 0.85em; opacity: 0.8; margin-top: 4px; color: var(--primary-color);">الموافق ميلادياً تقريباً: ${gDateStr}</div>
                                        <div class="occasion-desc" style="font-size: 0.85em; opacity: 0.9; margin-top: 4px; color: #17a2b8;"><i class="fas fa-moon"></i> وقت صلاة المغرب (ليلة المناسبة): ${maghribTimeStr}</div>
                                        <div class="occasion-desc" style="font-size: 0.85em; opacity: 0.8; margin-top: 4px;">${e.description || ''}</div>
                                        ${targetUrl !== '#' ? `<div style="font-size: 0.75em; margin-top: 10px; color: ${e.type === 'sad' ? '#ff6b6b' : '#28a745'}; font-weight: bold;"><i class="fas fa-hand-pointer"></i> اضغط هنا للحجز</div>` : ''}
                                    </div>
                                </div>
                            </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });

    if (html === '') {
        html = '<div class="text-center">لا توجد مناسبات مسجلة.</div>';
    }

    grid.innerHTML = html;
}

// --- Advanced Features: Calendar, Export, Add Event ---

let currentHijriYear = 1448; // Default fallback

function initOccasionsPage() {
    setupYearSelector();
    setupAddEventModal();
    setupExcelExport();

    // Initial Render
    renderOccasions();
}

// 1. Year Selector (5 Years)
function setupYearSelector() {
    const select = document.getElementById('hijriYearSelect');
    if (!select) return;

    // Dynamically calculate the current Hijri year
    let startYear = 1447; // fallback
    try {
        const today = new Date();
        const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).formatToParts(today);
        const yPart = parts.find(p => p.type === 'year');
        if (yPart) startYear = parseInt(yPart.value);
    } catch(e) {
        console.warn("Intl Ca Islamic not supported, falling back to 1447");
    }

    currentHijriYear = startYear;

    select.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const year = startYear + i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
    }

    select.addEventListener('change', (e) => {
        currentHijriYear = parseInt(e.target.value);
        renderOccasions(); // Re-render with new Gregorian mappings
    });
}

// 2. Add Event Logic
function setupAddEventModal() {
    const btn = document.getElementById('addEventBtn');
    const modal = document.getElementById('addEventModal');
    const form = document.getElementById('newEventForm');

    if (!btn || !modal || !form) return;

    btn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const newEvent = {
            id: 'custom_' + Date.now(),
            hijri: {
                month: parseInt(formData.get('month')),
                day: parseInt(formData.get('day'))
            },
            title: formData.get('title'),
            type: formData.get('type'),
            description: formData.get('description'),
            isCustom: true
        };

        saveCustomEvent(newEvent);
        modal.style.display = 'none';
        form.reset();
        renderOccasions(); // Refresh list
        alert('تم إضافة المناسبة بنجاح!');
    });
}

function saveCustomEvent(event) {
    const customEvents = JSON.parse(localStorage.getItem('custom_occasions') || '[]');
    customEvents.push(event);
    localStorage.setItem('custom_occasions', JSON.stringify(customEvents));

    // Sync to server silently
    fetch('/api/save_custom_occasion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
    }).catch(e => console.error("Could not sync occasion to server", e));
}

function getCombinedEvents(monthIndex) {
    // Built-in events
    const builtIn = getEventsByMonth(monthIndex);

    // Custom events
    const customEvents = JSON.parse(localStorage.getItem('custom_occasions') || '[]');
    const monthCustom = customEvents.filter(e => e.hijri.month === monthIndex);

    // Merge and Sort
    return [...builtIn, ...monthCustom].sort((a, b) => a.hijri.day - b.hijri.day);
}

// 3. Hijri to Gregorian Conversion (Approximation using Intl)
function getGregorianDateObj(hijriYear, month, day) {
    var jd = Math.floor((11 * hijriYear + 3) / 30) +
             354 * hijriYear + 
             30 * month -
             Math.floor((month - 1) / 2) + day + 1948440 - 385;

    var l = jd + 68569;
    var n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    var i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    var j = Math.floor((80 * l) / 2447);
    var d = l - Math.floor((2447 * j) / 80);
    l = Math.floor(j / 11);
    var m = j + 2 - 12 * l;
    var y = 100 * (n - 49) + i + l;

    return new Date(y, m - 1, d);
}

function getGregorianDate(hijriYear, month, day) {
    var date = getGregorianDateObj(hijriYear, month, day);
    return new Intl.DateTimeFormat('ar-BH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

// 4. Excel Export
function setupExcelExport() {
    const btn = document.getElementById('exportExcelBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const wb = XLSX.utils.book_new();
        const data = [];

        // Header
        data.push(["اليوم", "الشهر", "المناسبة", "الوصف", "النوع", "السنة الهجرية"]);

        // Rows
        for (let m = 1; m <= 12; m++) {
            const events = getCombinedEvents(m);
            const monthName = hijriMonths[m - 1];
            events.forEach(e => {
                data.push([
                    e.hijri.day,
                    monthName,
                    e.title,
                    e.description || "",
                    e.type === 'sad' ? 'عزاء' : (e.type === 'happy' ? 'احتفال' : 'ديني'),
                    currentHijriYear
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        // RTL option for sheet if supported, otherwise just data
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 10 }, { wch: 10 }];

        XLSX.utils.book_append_sheet(wb, ws, `Occasions ${currentHijriYear}`);
        XLSX.writeFile(wb, `occasions_${currentHijriYear}.xlsx`);
    });
}

// --- Modern Homepage Logic (Added via Automation) ---
let hijriOffset = parseInt(localStorage.getItem('hijri_offset') || '0');

function adjustHijriOffset(delta) {
    hijriOffset += delta;
    localStorage.setItem('hijri_offset', hijriOffset.toString());
    
    // Sync to server
    fetch('/api/save_offset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: hijriOffset })
    }).catch(e => console.error("Could not sync offset to server", e));
    
    // Show visual feedback or force re-render
    updateHeaderTime();
    renderHomeOccasions();
}

function renderHomePrayerTimes() {
    // 1. Coordinates (Bahrain)
    // Precise coords for Bahrain (Manama) as used by Al-Sayegh calendar
    const coords = { latitude: 26.2285, longitude: 50.5860 };

    if (typeof adhan === 'undefined') return;

    const coordinates = new adhan.Coordinates(coords.latitude, coords.longitude);
    const date = new Date();

    // Bahrain Shi'a specific calculation (Al-Sayegh / Ja'fari)
    // Uses Tehran method (Fajr 17.7°, Isha 14°, Maghrib 4.5°/Red Twlight) 
    // BUT commonly adds ~15 min to Sunset for Maghrib.
    const params = adhan.CalculationMethod.Tehran();
    params.madhab = adhan.Madhab.Shafi; // Asr factor standard

    // Adjustments to precisely match Taqwim Al Sayegh for Bahrain
    params.adjustments.fajr = 13;
    params.adjustments.dhuhr = 2;
    params.adjustments.maghrib = 15;
    params.adjustments.sunrise = 0;
    params.adjustments.dhuhr = 0; // Zuhr is usually solar noon
    params.adjustments.asr = 0;
    params.adjustments.maghrib = 15; // 15 min after sunset for full disk disappearance (cautionary)
    params.adjustments.isha = 0;

    // FORCE BAHRAIN TIMEZONE (UTC+3)
    // This ensures correct calculation regardless of user's device setting (e.g. if traveling or wrong clock)
    params.timezone = 3;

    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

    // Time Formatter
    const timeFormat = (t) => {
        let hours = t.getHours();
        const minutes = t.getMinutes().toString().padStart(2, '0');
        // const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes}`;
    };

    // Update Cards
    const fEl = document.getElementById('cardFajr');
    const dEl = document.getElementById('cardDhuhr');
    const mEl = document.getElementById('cardMaghrib');

    if (fEl) fEl.textContent = timeFormat(prayerTimes.fajr);
    if (dEl) dEl.textContent = timeFormat(prayerTimes.dhuhr);
    if (mEl) mEl.textContent = timeFormat(prayerTimes.maghrib);

    // Header Date (Hijri + Gregorian) removed from here - now handled by updateHeaderTime() in renderHomeOccasions


    // Banner: Next Prayer
    const next = prayerTimes.nextPrayer();
    const names = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', none: 'الفجر' };

    const bannerName = document.getElementById('bannerNextPrayer');
    const bannerTime = document.getElementById('bannerNextTime');

    if (bannerName) bannerName.textContent = names[next] || names['fajr'];
    if (bannerTime) {
        const nTime = prayerTimes.timeForPrayer(next) || prayerTimes.fajr; // fallback to fajr tomorrow roughly
        bannerTime.textContent = timeFormat(nTime);
    }
}

function renderHomeOccasions() {
    const container = document.getElementById('homeCalendarWidget');
    if (!container) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 1. Get current Hijri Year dynamically
    let hYearVal = currentHijriYear;
    try {
        const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).formatToParts(today);
        const yPart = parts.find(p => p.type === 'year');
        if (yPart) hYearVal = parseInt(yPart.value);
    } catch(e) {}

    // 2. Generate Calendar Grid
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    // Starting with Sunday natively in JS getDay()
    const dayNamesAr = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

    let html = `
        <div class="calendar-header">
            <span>${monthNamesAr[currentMonth]} ${currentYear}</span>
            <span style="font-size: 0.8em; color: var(--gold-primary); font-weight: normal; background: #FFF8E7; padding: 3px 8px; border-radius: 12px;">شهر ميلادي</span>
        </div>
        <div class="calendar-grid">
            ${dayNamesAr.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
    `;

    // Fill empty start days
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    // Helper formatter
    let formatter;
    try {
        formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' });
    } catch(e) {}
    
    let monthEventsHTML = '';
    const bookings = getBookings();
    const bookedDates = bookings.map(b => b.date); // format: YYYY-MM-DD

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const isToday = date.toDateString() === today.toDateString();
        
        // Use offset date for Hijri calculation globally in the grid!
        const offsetDate = new Date(date.getTime() + hijriOffset * 86400000);
        
        let hMonth = 0;
        let hDay = 0;

        if (formatter) {
            const hParts = formatter.formatToParts(offsetDate);
            const hm = hParts.find(p => p.type === 'month');
            const hd = hParts.find(p => p.type === 'day');
            if (hm) hMonth = parseInt(hm.value);
            if (hd) hDay = parseInt(hd.value);
        }

        // Find events in our data
        let dayEvents = [];
        if (hMonth > 0 && hDay > 0) {
            const allEvents = (typeof getCombinedEvents === 'function' ? getCombinedEvents(hMonth) : (typeof getEventsByMonth === 'function' ? getEventsByMonth(hMonth) : []));
            dayEvents = allEvents.filter(e => e.hijri.day === hDay);
        }

        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isBooked = bookedDates.includes(dateStr);
        const hasEvent = dayEvents.length > 0;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isBooked) classes += ' has-booking';
        else if (hasEvent) classes += ' has-event';

        const titleText = hasEvent ? dayEvents.map(e=>e.title).join(', ') : (isBooked ? 'محجوز' : '');
        html += `<div class="${classes}" title="${titleText}" onclick="openAddEventModal(${hMonth}, ${hDay}, '${day} ${monthNamesAr[currentMonth]}')" style="cursor: pointer;">${day}</div>`;

        // If has event and in future/today
        if (hasEvent && day >= today.getDate()) {
            dayEvents.forEach(e => {
                const isSad = e.type === 'sad';
                const isHappy = e.type === 'happy';
                let accentColor = 'var(--gold-primary)';
                let bgColor = '#FFF8E7';
                if (isSad) {
                    accentColor = '#dc3545';
                    bgColor = '#fff0f0';
                } else if (isHappy) {
                    accentColor = '#28a745';
                    bgColor = '#e8f5e9';
                }

                // Calculate Maghrib Time for this date
                let maghribTimeStr = "";
                if (typeof adhan !== 'undefined') {
                    const coords = new adhan.Coordinates(26.2285, 50.5860);
                    const params = adhan.CalculationMethod.Tehran();
                    params.madhab = adhan.Madhab.Shafi;
                    params.adjustments.maghrib = 15;
                    params.timezone = 3;
                    const pTimes = new adhan.PrayerTimes(coords, date, params);
                    let mt = pTimes.maghrib;
                    let h = mt.getHours() % 12 || 12;
                    let m = mt.getMinutes().toString().padStart(2, '0');
                    maghribTimeStr = `<div style="font-size: 0.75rem; color: #17a2b8; margin-top: 3px;"><i class="fas fa-moon"></i> صلاة المغرب: ${h}:${m}</div>`;
                }

                monthEventsHTML += `
                    <div class="occasion-item" style="padding: 10px 0; border-right: 3px solid ${accentColor}; padding-right: 12px; margin-bottom: 8px;">
                        <div class="occasion-date-box" style="padding: 5px; min-width: 50px; background: ${bgColor}; border-color: ${accentColor};">
                            <span class="occasion-date-day" style="font-size: 1rem; color: ${accentColor};">${day}</span>
                            <span class="occasion-date-month" style="font-size: 0.7rem;">${monthNamesAr[currentMonth]}</span>
                        </div>
                        <div class="occasion-details">
                            <div class="occasion-title" style="font-size: 0.9rem;">${e.title}</div>
                            <div class="occasion-desc" style="font-size: 0.75rem; color: #888;">يوافق ${hDay} ${typeof hijriMonths !== 'undefined' ? hijriMonths[hMonth - 1] : ''}</div>
                            ${maghribTimeStr}
                        </div>
                    </div>
                `;
            });
        }
    }

    html += `</div>`; // Close grid

    if (monthEventsHTML) {
        html += `<div class="calendar-events-list">
            <h4 style="font-size: 0.9rem; margin-bottom: 10px; color: var(--text-dark);">المناسبات القادمة هذا الشهر</h4>
            ${monthEventsHTML}
        </div>`;
    } else {
        html += `<div class="calendar-events-list text-center" style="color: #888; font-size: 0.85rem; padding: 10px;">لا توجد مناسبات قادمة هذا الشهر الميلادي</div>`;
    }

    container.innerHTML = html;

    // Start header time clock
    updateHeaderTime();
    // Only set interval once
    if (!window.headerTimeInterval) {
        window.headerTimeInterval = setInterval(updateHeaderTime, 60000);
    }
}

function updateHeaderTime() {
    const el = document.getElementById('headerDateDisplay');
    if (!el) return;
    const now = new Date();
    
    // Greg part
    const gParts = new Intl.DateTimeFormat('ar-BH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    
    // Hijri part with Offset
    let hParts = "";
    try {
        if (typeof adhan !== 'undefined' && typeof adhan.getHijriDate === 'function') {
            const hInfo = adhan.getHijriDate(now, hijriOffset);
            if (hInfo) {
                hParts = `${hInfo.day} ${hInfo.monthName} ${hInfo.year}`;
            }
        }
        if (!hParts) {
            const hDate = new Date(now.getTime() + hijriOffset * 86400000);
            hParts = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'islamic-umalqura' }).format(hDate);
        }
    } catch(e) {}
    
    el.innerHTML = `<div><i class="fas fa-calendar-alt"></i> ${gParts}</div>
                   ${hParts ? `<div style="font-size: 0.9em; color: var(--gold-primary); margin-top: 5px; font-weight: bold;"><i class="fas fa-moon"></i> ${hParts}</div>` : ''}`;
}

function renderNextMonthOccasions() {
    const listEl = document.getElementById('nextMonthList');
    const nameEl = document.getElementById('nextMonthName');
    if (!listEl || !nameEl) return;

    // Fast Forward exactly 1 Hijri month from now.
    // Instead of complex Hijri math, we can just get current Hijri month + 1
    const today = new Date(Date.now() + hijriOffset * 86400000);
    let hMonth = 8; // fallback
    let hYear = currentHijriYear;
    
    try {
        const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric' }).formatToParts(today);
        hMonth = parseInt(parts.find(p => p.type === 'month').value);
        const yPart = parts.find(p => p.type === 'year');
        if (yPart) hYear = parseInt(yPart.value);
    } catch(e) {}

    const targetHMonth = (hMonth % 12) + 1; // next month
    const targetHYear = (hMonth === 12) ? hYear + 1 : hYear;

    if (typeof hijriMonths !== 'undefined') {
        nameEl.textContent = hijriMonths[targetHMonth - 1];
    }

    const events = (typeof getCombinedEvents === 'function')
        ? getCombinedEvents(targetHMonth)
        : (typeof getEventsByMonth === 'function' ? getEventsByMonth(targetHMonth) : []);

    if (events.length === 0) {
        listEl.innerHTML = '<div style="font-size: 0.9rem; opacity: 0.8;">لا توجد مناسبات قادمة</div>';
        return;
    }

    let html = '';
    events.slice(0, 5).forEach(e => {
        const gregDate = (typeof getGregorianDate !== 'undefined') ? getGregorianDate(targetHYear, targetHMonth, e.hijri.day) : '';
        html += `
            <div class="next-month-item" style="display: flex; flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span class="next-month-item-title">${e.title}</span>
                    <span class="next-month-item-date">${e.hijri.day} ${hijriMonths[targetHMonth - 1]}</span>
                </div>
                ${gregDate ? `<div style="font-size: 0.75em; opacity: 0.8; color: #f1c40f; margin-top: 4px;">يوافق تقريباً: ${gregDate}</div>` : ''}
            </div>
        `;
    });
    listEl.innerHTML = html;
}

// Add Event from Calendar Modal Logic
function openAddEventModal(hMonth, hDay, gregStr) {
    if (!hMonth || !hDay) return;
    const modal = document.getElementById('addEventModal');
    if (!modal) return;

    document.getElementById('modalMonthVal').value = hMonth;
    document.getElementById('modalDayVal').value = hDay;
    
    const hMonthName = typeof hijriMonths !== 'undefined' ? hijriMonths[hMonth - 1] : hMonth;
    document.getElementById('modalDateDisplay').textContent = `${hDay} ${hMonthName} (الموافق ${gregStr})`;

    modal.style.display = 'flex';
}

const newEvForm = document.getElementById('newEventForm');
if (newEvForm) {
    newEvForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(newEvForm);

        const newEvent = {
            id: 'custom_' + Date.now(),
            hijri: {
                month: parseInt(formData.get('month')),
                day: parseInt(formData.get('day'))
            },
            title: formData.get('title'),
            type: formData.get('type'),
            description: formData.get('description'),
            isCustom: true
        };

        if (typeof saveCustomEvent === 'function') {
            saveCustomEvent(newEvent);
        } else {
            const customEvents = JSON.parse(localStorage.getItem('custom_occasions') || '[]');
            customEvents.push(newEvent);
            localStorage.setItem('custom_occasions', JSON.stringify(customEvents));
        }

        document.getElementById('addEventModal').style.display = 'none';
        newEvForm.reset();
        if (typeof renderHomeOccasions === 'function') renderHomeOccasions();
        alert('تم إضافة المناسبة بنجاح ولن تضيع إذا حدثت الصفحة!');
    });
}

