/**
 * Event Management System - Admin Dashboard Logic
 */

let allBookingsCache = [];

function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
    verifyAuth();
});

async function verifyAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        
        if (res.ok && data.status === 'success') {
            document.getElementById('authLoader').style.display = 'none';
            document.getElementById('mainDashboard').style.display = 'flex';
            
            document.getElementById('loggedInUser').innerHTML = `<i class="fas fa-user-circle"></i> ${data.name || 'مدير'}`;
            localStorage.setItem('admin_role', data.role);
            localStorage.setItem('admin_permissions', JSON.stringify(data.permissions || {}));
            
            // Apply Permissions to Menu
            if (data.role === 'superadmin') {
                document.getElementById('menu-reports').style.display = 'block';
                document.getElementById('menu-users').style.display = 'block';
                document.getElementById('menu-settings').style.display = 'block';
                document.getElementById('menu-prayer-settings').style.display = 'block';
                document.getElementById('menu-contributions').style.display = 'block';
                loadUsersData();
            } else if (data.permissions) {
                // Bookings (Default visible, hide if none)
                document.querySelector('[onclick="showSection(\'bookingsViewer\')"]').parentElement.style.display = (data.permissions.bookings && data.permissions.bookings !== 'none') ? 'block' : 'none';
                
                // Occasions (Default visible, hide if none)
                document.querySelector('[onclick="showSection(\'occasionsViewer\')"]').parentElement.style.display = (data.permissions.occasions && data.permissions.occasions !== 'none') ? 'block' : 'none';
                
                // Others (Default hidden, show if not none)
                document.getElementById('menu-reports').style.display = (data.permissions.reports && data.permissions.reports !== 'none') ? 'block' : 'none';
                document.getElementById('menu-settings').style.display = (data.permissions.settings && data.permissions.settings !== 'none') ? 'block' : 'none';
                document.getElementById('menu-prayer-settings').style.display = (data.permissions.prayer && data.permissions.prayer !== 'none') ? 'block' : 'none';
                document.getElementById('menu-contributions').style.display = (data.permissions.contributions && data.permissions.contributions !== 'none') ? 'block' : 'none';
            }
            
            loadDashboardData();
        } else {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        }
    } catch (e) {
        alert("فشل الاتصال بالخادم");
        window.location.href = 'login.html';
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
}

let reminderShownThisSession = false;

function showBookingsReminder(force = false) {
    if (reminderShownThisSession && !force) return;
    
    const container = document.getElementById('reminderBookingsContainer');
    const overlay = document.getElementById('reminderModalOverlay');
    if (!container || !overlay) return;
    
    // Sort and get the top 3 latest bookings (priority to date, then ID)
    const latest = [...allBookingsCache]
        .sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            return (b.id || 0) - (a.id || 0);
        })
        .slice(0, 3);
        
    if (latest.length === 0) return;
    
    container.innerHTML = latest.map(b => {
        let detailsHtml = '';
        if (b.details) {
            detailsHtml = `
                <div style="font-size: 0.8rem; color: #888; margin-top: 5px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <strong>الخدمة/القاعة:</strong> ${escapeHTML(b.details.service || b.type || '')} / ${escapeHTML(b.details.hall || '')}
                    ${b.details.time ? `<br><strong>الوقت:</strong> ${escapeHTML(b.details.time)}` : ''}
                </div>
            `;
        }
        return `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.25); border-radius: 10px; padding: 12px; text-align: right; direction: rtl;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: var(--primary-color); font-size: 0.95rem;"><i class="fas fa-calendar-day"></i> ${escapeHTML(b.date || '')}</span>
                    <span style="background: ${b.status === 'confirmed' ? 'rgba(40, 167, 69, 0.15)' : 'rgba(255, 193, 7, 0.15)'}; color: ${b.status === 'confirmed' ? '#28a745' : '#ffc107'}; font-size: 0.75rem; padding: 3px 10px; border-radius: 12px; font-weight: bold;">
                        ${b.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                    </span>
                </div>
                <div style="font-size: 0.88rem; line-height: 1.5; color: #eee;">
                    <strong>الاسم:</strong> ${escapeHTML(b.name || '')}<br>
                    <strong>الهاتف:</strong> ${escapeHTML(b.phone || '')}
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');
    
    overlay.style.display = 'flex';
    reminderShownThisSession = true;
}

function showSection(sectionId) {
    // Hide all
    ['homeViewer', 'bookingsViewer', 'contributionsViewer', 'reportsViewer', 'usersViewer', 'occasionsViewer', 'prayerSettingsViewer', 'settingsViewer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Remove active map
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    
    // Show selected
    const targetEl = document.getElementById(sectionId);
    if (targetEl) targetEl.style.display = 'block';
    
    // Set active link in sidebar
    const link = document.querySelector(`.sidebar-menu a[onclick*="${sectionId}"]`);
    if (link) link.classList.add('active');

    const titles = {
        'homeViewer': 'لوحة التحكم الرئيسية',
        'bookingsViewer': 'إدارة الحجوزات',
        'contributionsViewer': 'مساهمات المرحومين',
        'reportsViewer': 'التقارير المتقدمة',
        'usersViewer': 'إدارة المستخدمين',
        'occasionsViewer': 'المناسبات المخصصة',
        'prayerSettingsViewer': 'إعدادات الصلاة',
        'settingsViewer': 'إعدادات النظام'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'لوحة التحكم';

    if (sectionId === 'bookingsViewer') {
        showBookingsReminder();
    }
}

async function loadDashboardData() {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error("Failed to fetch");
        const db = await res.json();

        allBookingsCache = db.bookings || [];
        allContributionsCache = db.contributions || [];
        
        // Update home stats
        const homeDays = document.getElementById('homeDaysCount');
        const homeOccasions = document.getElementById('homeOccasionsCount');
        const homeBookings = document.getElementById('homeBookingsCount');
        if (homeDays) homeDays.textContent = "358";
        if (homeOccasions) homeOccasions.textContent = 108 + (db.custom_occasions || []).length;
        if (homeBookings) homeBookings.textContent = allBookingsCache.length;

        renderBookingsTable(allBookingsCache);
        renderContributionsTable(allContributionsCache);
        generateReport();
        
        loadOccasionsForAdminMonth();
        if (db.hijri_offset !== undefined) {
            document.getElementById('hijriOffsetInput').value = db.hijri_offset;
        }
        if (db.settings) {
            if (db.settings.whatsapp_phone) {
                const waInput = document.getElementById('whatsappPhoneInput');
                if (waInput) waInput.value = db.settings.whatsapp_phone;
            }
            if (db.settings.google_webapp_url) {
                const gUrlInput = document.getElementById('googleWebAppUrlInput');
                if (gUrlInput) gUrlInput.value = db.settings.google_webapp_url;
            }
            if (db.settings.contribution_price) {
                const cpInput = document.getElementById('contributionPriceInput');
                if (cpInput) cpInput.value = db.settings.contribution_price;
            }
            if (db.settings.hidden_pages) {
                document.querySelectorAll('input[name="hiddenPages"]').forEach(cb => {
                    if (db.settings.hidden_pages.includes(cb.value)) cb.checked = true;
                });
            }
            if (db.settings.hidden_prayers) {
                document.querySelectorAll('input[name="hiddenPrayers"]').forEach(cb => {
                    if (db.settings.hidden_prayers.includes(cb.value)) cb.checked = true;
                });
            }
            if (db.settings.prayer_reference_url) {
                const container = document.getElementById('currentPrayerRefContainer');
                const link = document.getElementById('currentPrayerRefLink');
                if (container && link) {
                    container.style.display = 'block';
                    link.href = db.settings.prayer_reference_url;
                }
            }
            if (db.settings.prayer_reference_option) {
                const optRadio = document.querySelector(`input[name="refUpdateOption"][value="${db.settings.prayer_reference_option}"]`);
                if (optRadio) optRadio.checked = true;
            }
        }

        // Apply read-only constraints to forms
        const role = localStorage.getItem('admin_role');
        const perms = JSON.parse(localStorage.getItem('admin_permissions') || '{}');

        if (role !== 'superadmin') {
            if (perms.occasions !== 'write') {
                const f = document.getElementById('adminOccasionForm');
                if (f) f.style.display = 'none';
            }
            if (perms.settings !== 'write') {
                const b = document.querySelector('#generalSettingsForm button[type="submit"]');
                if (b) b.style.display = 'none';
            }
            if (perms.prayer !== 'write') {
                const b1 = document.querySelector('#offsetForm button[type="submit"]');
                const b2 = document.querySelector('#prayerSettingsForm button[type="submit"]');
                if (b1) b1.style.display = 'none';
                if (b2) b2.style.display = 'none';
            }
        }

    } catch (e) {
        console.error("Error loading dashboard data", e);
    }
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    if (!bookings.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد حجوزات حالياً</td></tr>';
        document.getElementById('statTotalBooks').textContent = 0;
        document.getElementById('statPendingBooks').textContent = 0;
        document.getElementById('statApprovedBooks').textContent = 0;
        return;
    }

    let pendingCount = 0;
    let approvedCount = 0;
    
    const role = localStorage.getItem('admin_role');
    const perms = JSON.parse(localStorage.getItem('admin_permissions') || '{}');
    const canWrite = role === 'superadmin' || perms.bookings === 'write';

    tbody.innerHTML = bookings.map(b => {
        const status = b.status || 'pending';
        let statusBadge = '';
        let actionBtns = '';

        if (status === 'pending') {
            pendingCount++;
            statusBadge = '<span class="status-badge status-pending">قيد الانتظار</span>';
            if (canWrite) {
                actionBtns = `
                    <button class="action-btn btn-approve" onclick="updateStatus(${b.id}, 'approved')"><i class="fas fa-check"></i></button>
                    <button class="action-btn btn-reject" onclick="updateStatus(${b.id}, 'rejected')"><i class="fas fa-times"></i></button>
                `;
            } else {
                actionBtns = '<span style="color:#aaa; font-size:0.8em;">للقراءة فقط</span>';
            }
        } else if (status === 'approved') {
            approvedCount++;
            statusBadge = '<span class="status-badge status-approved">مؤكد</span>';
            actionBtns = canWrite ? `<button class="action-btn btn-reject" onclick="updateStatus(${b.id}, 'rejected')"><i class="fas fa-times"></i></button>` : '';
        } else if (status === 'rejected') {
            statusBadge = '<span class="status-badge status-rejected">مرفوض</span>';
            actionBtns = canWrite ? `<button class="action-btn btn-approve" onclick="updateStatus(${b.id}, 'approved')"><i class="fas fa-check"></i></button>` : '';
        }

        const details = b.details?.service || b.details?.event_type || 'غير محدد';

        return `
            <tr>
                <td style="font-family: monospace;">#${b.id.toString().slice(-6)}</td>
                <td><strong>${escapeHTML(b.name || 'غير معروف')}</strong></td>
                <td style="direction: ltr;">${escapeHTML(b.phone || '-')}</td>
                <td>${escapeHTML(b.date)}</td>
                <td>${escapeHTML(details)}</td>
                <td>${statusBadge}</td>
                <td>${actionBtns}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('statTotalBooks').textContent = bookings.length;
    document.getElementById('statPendingBooks').textContent = pendingCount;
    document.getElementById('statApprovedBooks').textContent = approvedCount;
}

// --- Contributions Management ---
let allContributionsCache = [];

function renderContributionsTable(contributions) {
    const tbody = document.getElementById('contributionsTableBody');
    if (!tbody) return;
    
    if (!contributions.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد طلبات مساهمة</td></tr>';
        return;
    }

    tbody.innerHTML = contributions.map(c => {
        const status = c.status || 'pending';
        let statusBadge = '<span class="status-badge status-pending">قيد الانتظار</span>';
        if (status === 'approved') statusBadge = '<span class="status-badge status-approved">مؤكد</span>';
        
        const count = c.deceased_list ? c.deceased_list.length : 0;
        
        return `
            <tr>
                <td>${escapeHTML(c.date)}</td>
                <td><strong>${escapeHTML(c.sender_name || 'غير معروف')}</strong></td>
                <td style="direction: ltr;">${escapeHTML(c.sender_phone || '-')}</td>
                <td>${count} أسماء</td>
                <td style="color:var(--gold-primary); font-weight:bold;">${c.total_amount || 0} د.ب</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-view" onclick="openContributionModal('${escapeHTML(c.id)}')"><i class="fas fa-eye"></i> عرض التفاصيل</button>
                </td>
            </tr>
        `;
    }).join('');
}

function openContributionModal(id) {
    const c = allContributionsCache.find(x => x.id === id);
    if(!c) return;

    let deceasedHTML = '<ul style="margin:0; padding-right:15px; font-size:1rem; list-style-type:square; line-height: 1.8;">';
    if(c.deceased_list) {
        c.deceased_list.forEach((dec, idx) => {
            let photoLink = dec.photo ? `<a href="${escapeHTML(dec.photo)}" target="_blank" style="color:var(--primary-color); font-size:0.9em;">[عرض صورة المرحوم]</a>` : '';
            deceasedHTML += `<li>${escapeHTML(dec.name)} ${photoLink}</li>`;
        });
    }
    deceasedHTML += '</ul>';

    const modalHtml = `
        <h3 style="color: var(--primary-color); margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">تفاصيل المساهمة</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #000;">
            <div><strong>الاسم:</strong> ${escapeHTML(c.sender_name)}</div>
            <div style="direction:ltr;"><strong>الهاتف:</strong> ${escapeHTML(c.sender_phone)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #555;">
            <div><strong>الشهر الهجري:</strong> ${escapeHTML(c.hijri_month || '-')}</div>
            <div><strong>المناسبة:</strong> ${escapeHTML(c.occasion || '-')}</div>
        </div>
        <div style="background: #fdfdfd; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #000;">
            <p style="margin-top:0; font-weight:bold;">أسماء المرحومين:</p>
            ${deceasedHTML}
            <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong>المجموع الكلي:</strong> <span style="color:green; font-weight:bold;">${c.total_amount} د.ب</span>
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <strong>صورة إيصال التحويل (بنفت):</strong>
            ${c.receipt_image ? `<div style="margin-top:10px; text-align:center;"><a href="${escapeHTML(c.receipt_image)}" target="_blank"><img src="${escapeHTML(c.receipt_image)}" style="max-width:100%; border-radius:8px; border:1px solid #ddd;"></a></div>` : '<p>لم يتم إرفاق صورة.</p>'}
        </div>
        <button class="btn-primary" style="background: #666; width: 100%; margin-top: 10px;" onclick="document.getElementById('viewModalOverlay').style.display='none'">إغلاق</button>
    `;
    
    document.getElementById('viewModalContent').innerHTML = modalHtml;
    document.getElementById('viewModalOverlay').style.display = 'flex';
}

async function updateStatus(id, status) {
    const role = localStorage.getItem('admin_role');
    const perms = JSON.parse(localStorage.getItem('admin_permissions') || '{}');
    if (role !== 'superadmin' && perms.bookings !== 'write') {
        alert('ليس لديك صلاحية لتعديل الحجوزات!');
        return;
    }

    if(!confirm(`هل أنت متأكد من تغيير حالة الطلب؟`)) return;

    try {
        const token = localStorage.getItem('admin_token');
        await fetch('/api/update_booking_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id, status })
        });
        loadDashboardData();
    } catch (e) {
        alert("فشل التحديث");
    }
}

let adminCalendarData = null;
let currentAdminOccasionMonth = 1;

async function loadOccasionsForAdminMonth() {
    const monthSelect = document.getElementById('adminOccasionMonthSelect');
    if (!monthSelect) return;
    currentAdminOccasionMonth = parseInt(monthSelect.value);

    if (!adminCalendarData) {
        try {
            const res = await fetch('/uploads/structured-calendar-1448.json');
            if (res.ok) {
                adminCalendarData = await res.json();
            }
        } catch(e) {
            console.error("Failed to load calendar data for admin:", e);
        }
    }

    const tbody = document.getElementById('occasionsTableBody');
    if (!tbody || !adminCalendarData) return;

    const monthData = adminCalendarData.months.find(m => m.monthNumber === currentAdminOccasionMonth);
    if (!monthData) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: #888; text-align: center;">لا توجد مناسبات لهذا الشهر.</td></tr>';
        return;
    }

    const occasions = monthData.occasions || [];
    if (occasions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: #888; text-align: center;">لا توجد مناسبات مسجلة لهذا الشهر.</td></tr>';
        return;
    }

    const mapType = { 'BIRTH': 'ولادة / فرح', 'MARTYRDOM': 'وفاة / حزن', 'GENERAL': 'عامة' };

    tbody.innerHTML = occasions.map(o => `
        <tr>
            <td style="font-weight: bold; font-size: 1.1rem; color: var(--primary);">${o.hijriDay}</td>
            <td style="text-align: right; padding-right: 20px; font-weight: 600;">${escapeHTML(o.title)}</td>
            <td style="color: ${o.eventType === 'MARTYRDOM' ? '#dc3645' : o.eventType === 'BIRTH' ? '#2ecc71' : 'var(--text-dark)'};">${mapType[o.eventType] || o.eventType || 'عامة'}</td>
            <td>
                <button class="btn-edit" style="padding: 4px 10px; font-size: 0.8rem;" onclick="editCalendarOccasionClick('${o.id}', ${o.hijriDay}, '${escapeJS(o.title)}', '${o.eventType}')"><i class="fas fa-edit"></i> تعديل</button>
                <button class="btn-delete" style="padding: 4px 10px; font-size: 0.8rem;" onclick="deleteCalendarOccasionClick(${o.hijriDay}, '${o.id}')"><i class="fas fa-trash-alt"></i> حذف</button>
            </td>
        </tr>
    `).join('');
}

function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\'").replace(/"/g, '\"');
}

function editCalendarOccasionClick(id, day, title, type) {
    document.getElementById('adminOccId').value = id;
    document.getElementById('occDay').value = day;
    document.getElementById('occTitle').value = title;
    
    const selectType = document.getElementById('occType');
    selectType.value = type || 'GENERAL';
    
    const btn = document.getElementById('submitOccBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> تحديث المناسبة';
    
    const cancelBtn = document.getElementById('cancelOccEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function cancelOccasionEdit() {
    document.getElementById('adminOccId').value = '';
    document.getElementById('adminOccasionForm').reset();
    
    const btn = document.getElementById('submitOccBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-plus"></i> إضافة مناسبة';
    
    const cancelBtn = document.getElementById('cancelOccEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

async function deleteCalendarOccasionClick(day, id) {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه المناسبة من التقويم؟")) return;
    
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch('/api/delete_calendar_occasion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, monthNumber: currentAdminOccasionMonth, occasionId: id })
        });
        if (res.ok) {
            alert("✅ تم حذف المناسبة بنجاح!");
            adminCalendarData = null; // force reload
            loadOccasionsForAdminMonth();
        } else {
            alert("❌ فشل حذف المناسبة.");
        }
    } catch(e) {
        alert("❌ خطأ أثناء الاتصال بالخادم.");
    }
}

async function saveAdminOccasion(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const occId = document.getElementById('adminOccId').value;
    const month = parseInt(document.getElementById('occMonth').value);
    const day = parseInt(document.getElementById('occDay').value);
    const title = document.getElementById('occTitle').value;
    const type = document.getElementById('occType').value;

    let url = '/api/add_calendar_occasion';
    let payload = { token, monthNumber: month, hijriDay: day, title, eventType: type };

    if (occId) {
        url = '/api/edit_calendar_occasion';
        payload.occasionId = occId;
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert(occId ? "✅ تم تحديث المناسبة بنجاح!" : "✅ تم إضافة المناسبة بنجاح!");
            cancelOccasionEdit();
            adminCalendarData = null; // force reload
            
            // Sync current list view month to the month we edited
            const filterMonth = document.getElementById('adminOccasionMonthSelect');
            if (filterMonth) {
                filterMonth.value = month;
            }
            loadOccasionsForAdminMonth();
        } else {
            alert("❌ فشل حفظ المناسبة.");
        }
    } catch(e) {
        alert("❌ خطأ في الاتصال بالخادم.");
    }
}

async function saveGeneralSettings(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const phoneInputElem = document.getElementById('whatsappPhoneInput');
    const phoneInput = phoneInputElem ? phoneInputElem.value : '';

    const gUrlInputElem = document.getElementById('googleWebAppUrlInput');
    const googleWebAppUrl = gUrlInputElem ? gUrlInputElem.value : '';

    const priceInputElem = document.getElementById('contributionPriceInput');
    const contributionPrice = priceInputElem ? parseInt(priceInputElem.value) || 5 : 5;

    const hiddenPages = Array.from(document.querySelectorAll('input[name="hiddenPages"]:checked')).map(cb => cb.value);
    const hiddenPrayers = Array.from(document.querySelectorAll('input[name="hiddenPrayers"]:checked')).map(cb => cb.value);

    try {
        const res = await fetch('/api/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token, 
                settings: {
                    whatsapp_phone: phoneInput,
                    google_webapp_url: googleWebAppUrl,
                    contribution_price: contributionPrice,
                    hidden_pages: hiddenPages,
                    hidden_prayers: hiddenPrayers
                }
            })
        });
        if(res.ok) {
            alert('تم حفظ الإعدادات العامة بنجاح!');
            // Update local storage so it reflects immediately
            const currentSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
            currentSettings.whatsapp_phone = phoneInput;
            currentSettings.google_webapp_url = googleWebAppUrl;
            currentSettings.contribution_price = contributionPrice;
            currentSettings.hidden_pages = hiddenPages;
            currentSettings.hidden_prayers = hiddenPrayers;
            localStorage.setItem('site_settings', JSON.stringify(currentSettings));
        }
    } catch(err) {
        alert("فشل التعديل");
    }
}

async function savePrayerSettings(e) {
    // Both forms use the same logic because they read the DOM globally.
    return saveGeneralSettings(e);
}

// --- Reports & Actions ---
function generateReport() {
    const typeFilter = document.getElementById('reportTypeFilter') ? document.getElementById('reportTypeFilter').value : 'all';
    const dateFrom = document.getElementById('dateFrom') ? document.getElementById('dateFrom').value : '';
    const dateTo = document.getElementById('dateTo') ? document.getElementById('dateTo').value : '';
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    let filtered = allBookingsCache.filter(b => {
        let matchType = true;
        if (typeFilter !== 'all') {
            matchType = b.type && b.type.includes(typeFilter);
        }
        let matchDate = true;
        if (dateFrom) matchDate = matchDate && (b.date >= dateFrom);
        if (dateTo) matchDate = matchDate && (b.date <= dateTo);
        return matchType && matchDate;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد سجلات تطابق عوامل التصفية</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(b => {
        let statusStr = b.status || 'pending';
        let statusLabel = 'قيد المراجعة';
        let statusClass = 'status-pending';
        if(statusStr === 'approved' || statusStr === 'accepted') { statusLabel = 'مقبول ✅'; statusClass = 'status-approved'; }
        if(statusStr === 'rejected') { statusLabel = 'مرفوض ❌'; statusClass = 'status-rejected'; }

        let trId = b.id.toString().substring(b.id.toString().length - 5);
        let typeBadge = '<span class="status-badge" style="background: rgba(212,175,55,0.1); color: var(--primary-color); border-radius: 4px; padding: 4px 8px;">' + escapeHTML((b.type || '').replace('بوابة المأتم - ', '')) + '</span>';
        
        const role = localStorage.getItem('admin_role');
        const perms = JSON.parse(localStorage.getItem('admin_permissions') || '{}');
        const canWrite = role === 'superadmin' || perms.reports === 'write';

        let detailsBtn = `<button class="btn-view" onclick="openViewModal('${escapeHTML(b.id)}')" title="عرض التفاصيل"><i class="fas fa-eye"></i> عرض</button>`;
        let editBtn = canWrite ? `<button class="btn-edit" onclick="openEditModal('${escapeHTML(b.id)}')" title="تعديل"><i class="fas fa-edit"></i> تعديل</button>` : '';
        let deleteBtn = '';
        if (role === 'superadmin') {
            deleteBtn = `<button class="btn-delete" onclick="deleteBooking('${escapeHTML(b.id)}')" title="حذف"><i class="fas fa-trash"></i> حذف</button>`;
        }

        return `
        <tr>
            <td>#${escapeHTML(trId)}</td>
            <td style="font-weight:bold;">${escapeHTML(b.date)}</td>
            <td>${typeBadge}</td>
            <td>${escapeHTML(b.name)}</td>
            <td style="direction:ltr;">${escapeHTML(b.phone)}</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td class="action-btns" style="display:flex; gap: 8px; justify-content:center; flex-wrap:wrap;">
                ${detailsBtn} ${editBtn} ${deleteBtn}
            </td>
        </tr>
        `;
    }).join('');
}

function openViewModal(id) {
    const b = allBookingsCache.find(x => x.id.toString() === id.toString());
    if(!b) return;

    let detailsHTML = '<ul style="margin:0; padding-right:15px; font-size:1rem; list-style-type:square; line-height: 1.8;">';
    if(b.details && b.details.time) detailsHTML += `<li><strong>الوقت:</strong> ${escapeHTML(b.details.time)}</li>`;
    if(b.details && b.details.service) detailsHTML += `<li><strong>الخدمة/المناسبة:</strong> ${escapeHTML(b.details.service)}</li>`;
    if(b.details && b.details.hall) detailsHTML += `<li><strong>الموقع:</strong> ${escapeHTML(b.details.hall)}</li>`;
    if(b.details && b.details.package) detailsHTML += `<li><strong>الباقة:</strong> ${escapeHTML(b.details.package)}</li>`;
    
    // Addons
    if(b.details && b.details.has_tables) detailsHTML += `<li><strong>طاولات:</strong> ${escapeHTML(b.details.tables_count || 1)}</li>`;
    if(b.details && b.details.has_chairs) detailsHTML += `<li><strong>كراسي:</strong> ${escapeHTML(b.details.chairs_count || 1)}</li>`;
    if(b.details && b.details.has_tea) detailsHTML += `<li><strong>شاي</strong></li>`;
    if(b.details && b.details.has_coffee) detailsHTML += `<li><strong>قهوة</strong></li>`;
    if(b.details && b.details.other_services) detailsHTML += `<li><strong>ملاحظات:</strong> ${escapeHTML(b.details.other_services)}</li>`;
    detailsHTML += '</ul>';

    let statusStr = b.status || 'pending';
    let statusLabel = 'قيد المراجعة 🕳️';
    if(statusStr === 'approved' || statusStr === 'accepted') statusLabel = 'مقبول ✅';
    if(statusStr === 'rejected') statusLabel = 'مرفوض ❌';

    const formattedId = b.id.toString().substring(b.id.toString().length - 5);
    const modalHtml = `
        <h3 style="color: var(--primary-color); margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">تفاصيل الطلب: #${formattedId}</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #000;">
            <div><strong>الاسم:</strong> ${escapeHTML(b.name)}</div>
            <div style="direction:ltr;"><strong>الهاتف:</strong> ${escapeHTML(b.phone)}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #555;">
            <div><strong>تاريخ الحجز:</strong> ${escapeHTML(b.date)}</div>
            <div><strong>الحالة:</strong> ${statusLabel}</div>
        </div>
        <div style="background: #fdfdfd; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #000;">
            ${detailsHTML}
        </div>
        <div style="display:flex; gap: 10px; margin-top: 20px;">
            <button class="btn-primary" onclick="updateStatus('${escapeHTML(b.id)}', 'approved')" style="flex:1; background: #28a745;"><i class="fas fa-check"></i> قبول</button>
            <button class="btn-primary" onclick="updateStatus('${escapeHTML(b.id)}', 'rejected')" style="flex:1; background: #dc3545;"><i class="fas fa-times"></i> رفض</button>
        </div>
        <button class="btn-primary" style="background: #666; width: 100%; margin-top: 10px;" onclick="document.getElementById('viewModalOverlay').style.display='none'">إغلاق</button>
    `;
    
    document.getElementById('viewModalContent').innerHTML = modalHtml;
    document.getElementById('viewModalOverlay').style.display = 'flex';
}

function openEditModal(id) {
    const b = allBookingsCache.find(x => x.id.toString() === id.toString());
    if(!b) return;

    document.getElementById('editBookingId').value = b.id;
    document.getElementById('editName').value = b.name || '';
    document.getElementById('editPhone').value = b.phone || '';
    document.getElementById('editDate').value = b.date || '';

    document.getElementById('editModalOverlay').style.display = 'flex';
}

async function submitEditBooking(e) {
    e.preventDefault();
    const id = document.getElementById('editBookingId').value;
    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const date = document.getElementById('editDate').value;

    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/edit_booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id, name, phone, date })
        });
        if(res.ok) {
            alert('تم تعديل بيانات الحجز بنجاح');
            document.getElementById('editModalOverlay').style.display = 'none';
            loadDashboardData();
        }
    } catch(err) {
        alert("فشل التعديل");
    }
}

async function deleteBooking(id) {
    if(!confirm("هل أنت متأكد من حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذه الخطوة.")) return;

    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/delete_booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id })
        });
        if(res.ok) {
            alert('تم حذف الحجز بنجاح!');
            loadDashboardData();
        }
    } catch(err) {
        alert("فشل الحذف");
    }
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("جاري تحميل مكتبة حفظ الملفات، يرجى المحاولة بعد لحظات.");
        return;
    }
    const table = document.getElementById('reportTable');
    if (!table) {
        alert("لا يوجد جدول للتصدير");
        return;
    }
    const wb = XLSX.utils.table_to_book(table, {sheet: "التقارير"});
    XLSX.writeFile(wb, 'تقرير_الحجوزات.xlsx');
}

// --- User Management ---
let allUsersCache = [];

async function loadUsersData() {
    const token = localStorage.getItem('admin_token');
    try {
        const res = await fetch('/api/get_users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            allUsersCache = data.users || [];
            renderUsersTable(allUsersCache);
        }
    } catch (e) {
        console.error("فشل تحميل المستخدمين");
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا يوجد مستخدمين آخرين</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(u => {
        const roleName = u.role === 'superadmin' ? 'مدير عام <i class="fas fa-star" style="color:var(--gold);"></i>' : 'مخصص <i class="fas fa-user-cog" style="color:var(--primary-color);"></i>';
        return `
        <tr>
            <td>${u.username}</td>
            <td>${u.name || '-'}</td>
            <td>${roleName}</td>
            <td>
                <button class="btn-edit" onclick="editSystemUser('${u.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="deleteSystemUser('${u.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
        `;
    }).join('');
}

function editSystemUser(id) {
    const u = allUsersCache.find(x => x.id === id);
    if (!u) return;
    
    document.getElementById('userIdInput').value = u.id;
    document.getElementById('userUsername').value = u.username;
    document.getElementById('userName').value = u.name || '';
    document.getElementById('userRole').value = u.role;
    document.getElementById('userPassword').value = '';
    
    // permissions
    if (typeof togglePermissionsGrid === 'function') togglePermissionsGrid();
    
    if (u.role !== 'superadmin' && u.permissions) {
        ['bookings', 'contributions', 'reports', 'occasions', 'prayer', 'settings'].forEach(key => {
            let val = u.permissions[key] || 'none';
            const r = document.querySelector(`input[name="perm_${key}"][value="${val}"]`);
            if (r) r.checked = true;
        });
    } else {
        // Reset to default none
        document.querySelectorAll('input[type="radio"][value="none"]').forEach(r => r.checked = true);
    }
    
    // scroll to form
    document.getElementById('userForm').scrollIntoView({behavior: 'smooth'});
}

async function saveUserSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    if(localStorage.getItem('admin_role') !== 'superadmin') {
        alert("ليس لديك الصلاحية!");
        return;
    }
    
    let perms = {};
    if (document.getElementById('userRole').value !== 'superadmin') {
        ['bookings', 'contributions', 'reports', 'occasions', 'prayer', 'settings'].forEach(key => {
            const checked = document.querySelector(`input[name="perm_${key}"]:checked`);
            perms[key] = checked ? checked.value : 'none';
        });
    }

    const userData = {
        id: document.getElementById('userIdInput').value,
        username: document.getElementById('userUsername').value,
        name: document.getElementById('userName').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value,
        permissions: perms
    };
    
    try {
        const res = await fetch('/api/save_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, user: userData })
        });
        if(res.ok) {
            alert('تم حفظ بيانات المستخدم بنجاح');
            document.getElementById('userForm').reset();
            document.getElementById('userIdInput').value = '';
            loadUsersData();
        } else {
            alert("فشل حفظ بيانات المستخدم");
        }
    } catch(err) {
        alert("فشل الاتصال بالخادم");
    }
}

async function deleteSystemUser(id) {
    if(!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    const token = localStorage.getItem('admin_token');
    
    try {
        const res = await fetch('/api/delete_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, id })
        });
        if(res.ok) {
            alert('تم حذف المستخدم بنجاح');
            loadUsersData();
        } else {
            alert("لا يمكنك حذف حسابك الشخصي أو حدث خطأ.");
        }
    } catch(err) {
        alert("فشل الاتصال بالخادم");
    }
}

async function exportFullDatabaseToGoogle() {
    const token = localStorage.getItem('admin_token');
    if(!confirm("هل أنت متأكد من رغبتك في تصدير قاعدة البيانات بالكامل إلى Google Sheets؟ سيتم إنشاء أوراق عمل مخصصة ومنعزلة لكل جدول.")) return;
    
    const btn = event.currentTarget;
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تصدير البيانات...';
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/export_full_database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert('تم تصدير قاعدة البيانات بالكامل بنجاح إلى ملف Google Sheets!');
        } else {
            alert(data.message || 'فشل التصدير. يرجى التأكد من إدخال وحفظ رابط Google Web App URL أولاً في الإعدادات.');
        }
    } catch(e) {
        alert('حدث خطأ في الاتصال بالخادم.');
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

async function savePrayerReference(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const fileInput = document.getElementById('prayerRefFile');
    const file = fileInput.files[0];
    const option = document.querySelector('input[name="refUpdateOption"]:checked').value;
    
    if (!file) {
        alert("الرجاء اختيار ملف أولاً");
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري رفع وحفظ الجدول...';
    btn.disabled = true;
    
    const reader = new FileReader();
    reader.onload = async function() {
        const base64Data = reader.result;
        try {
            const res = await fetch('/api/upload_prayer_reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    file_data: base64Data,
                    filename: file.name,
                    update_option: option
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                alert('تم رفع وحفظ جدول مواقيت الصلاة المرجعي بنجاح!');
                const container = document.getElementById('currentPrayerRefContainer');
                const link = document.getElementById('currentPrayerRefLink');
                if (container && link) {
                    container.style.display = 'block';
                    link.href = data.file_url;
                }
                loadDashboardData();
            } else {
                alert(data.message || 'فشل الرفع');
            }
        } catch(err) {
            alert('خطأ في الاتصال بالخادم أثناء رفع الملف');
        } finally {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}
