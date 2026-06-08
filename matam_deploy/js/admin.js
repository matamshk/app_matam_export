/**
 * Event Management System - Admin Dashboard Logic
 */

let allBookingsCache = [];

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
            
            if (data.role === 'superadmin') {
                document.getElementById('menu-users').style.display = 'block';
                document.getElementById('menu-occasions').style.display = 'block';
                document.getElementById('menu-settings').style.display = 'block';
                loadUsersData();
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

function showSection(sectionId) {
    // Hide all
    ['bookingsViewer', 'reportsViewer', 'usersViewer', 'occasionsViewer', 'settingsViewer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Remove active map
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    
    // Show selected
    document.getElementById(sectionId).style.display = 'block';
    event.currentTarget.classList.add('active');

    const titles = {
        'bookingsViewer': 'إدارة الحجوزات',
        'reportsViewer': 'التقارير المتقدمة',
        'usersViewer': 'إدارة المستخدمين',
        'occasionsViewer': 'المناسبات المخصصة',
        'settingsViewer': 'إعدادات النظام'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId];
}

async function loadDashboardData() {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error("Failed to fetch");
        const db = await res.json();

        allBookingsCache = db.bookings || [];
        renderBookingsTable(allBookingsCache);
        generateReport();
        
        renderOccasionsTable(db.custom_occasions || []);
        if (db.hijri_offset !== undefined) {
            document.getElementById('hijriOffsetInput').value = db.hijri_offset;
        }
        if (db.settings && db.settings.whatsapp_phone) {
            const waInput = document.getElementById('whatsappPhoneInput');
            if (waInput) waInput.value = db.settings.whatsapp_phone;
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

    tbody.innerHTML = bookings.map(b => {
        const status = b.status || 'pending';
        let statusBadge = '';
        let actionBtns = '';

        if (status === 'pending') {
            pendingCount++;
            statusBadge = '<span class="status-badge status-pending">قيد الانتظار</span>';
            actionBtns = `
                <button class="action-btn btn-approve" onclick="updateStatus(${b.id}, 'approved')"><i class="fas fa-check"></i></button>
                <button class="action-btn btn-reject" onclick="updateStatus(${b.id}, 'rejected')"><i class="fas fa-times"></i></button>
            `;
        } else if (status === 'approved') {
            approvedCount++;
            statusBadge = '<span class="status-badge status-approved">مؤكد</span>';
            actionBtns = `<button class="action-btn btn-reject" onclick="updateStatus(${b.id}, 'rejected')"><i class="fas fa-times"></i></button>`;
        } else if (status === 'rejected') {
            statusBadge = '<span class="status-badge status-rejected">مرفوض</span>';
            actionBtns = `<button class="action-btn btn-approve" onclick="updateStatus(${b.id}, 'approved')"><i class="fas fa-check"></i></button>`;
        }

        const details = b.details?.service || b.details?.event_type || 'غير محدد';

        return `
            <tr>
                <td style="font-family: monospace;">#${b.id.toString().slice(-6)}</td>
                <td><strong>${b.name || 'غير معروف'}</strong></td>
                <td style="direction: ltr;">${b.phone || '-'}</td>
                <td>${b.date}</td>
                <td>${details}</td>
                <td>${statusBadge}</td>
                <td>${actionBtns}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('statTotalBooks').textContent = bookings.length;
    document.getElementById('statPendingBooks').textContent = pendingCount;
    document.getElementById('statApprovedBooks').textContent = approvedCount;
}

async function updateStatus(id, status) {
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

function renderOccasionsTable(occasions) {
    const tbody = document.getElementById('occasionsTableBody');
    if (!occasions.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">لا توجد مناسبات مخصصة</td></tr>';
        return;
    }

    const mapMonth = ["-","محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
    const mapType = { 'religious': 'ديني', 'happy': 'سعيد', 'sad': 'حزين' };

    tbody.innerHTML = occasions.map(o => `
        <tr>
            <td>${mapMonth[o.hijri.month]}</td>
            <td>${o.hijri.day}</td>
            <td>${o.title}</td>
            <td>${mapType[o.type] || o.type}</td>
        </tr>
    `).join('');
}

async function saveAdminOccasion(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    
    const newEvent = {
        id: 'admin_custom_' + Date.now(),
        hijri: {
            month: parseInt(document.getElementById('occMonth').value),
            day: parseInt(document.getElementById('occDay').value)
        },
        title: document.getElementById('occTitle').value,
        type: document.getElementById('occType').value,
        description: document.getElementById('occDesc').value,
        isCustom: true
    };

    try {
        const res = await fetch('/api/save_custom_occasion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, ...newEvent })
        });
        if(res.ok) {
            alert('تم الحفظ بنجاح');
            e.target.reset();
            loadDashboardData();
        }
    } catch(err) {
        alert("فشل الحفظ");
    }
}

async function saveOffset(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const offset = parseInt(document.getElementById('hijriOffsetInput').value);

    try {
        const res = await fetch('/api/save_offset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, offset })
        });
        if(res.ok) {
            alert('تم تعديل الإزاحة بنجاح!');
        }
    } catch(err) {
        alert("فشل التعديل");
    }
}

async function saveGeneralSettings(e) {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const phoneInput = document.getElementById('whatsappPhoneInput').value;

    try {
        const res = await fetch('/api/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token, 
                settings: {
                    whatsapp_phone: phoneInput
                }
            })
        });
        if(res.ok) {
            alert('تم حفظ الإعدادات العامة بنجاح!');
        }
    } catch(err) {
        alert("فشل التعديل");
    }
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
        let typeBadge = '<span class="status-badge" style="background: rgba(212,175,55,0.1); color: var(--primary-color); border-radius: 4px; padding: 4px 8px;">' + (b.type || '').replace('بوابة المأتم - ', '') + '</span>';
        
        let detailsBtn = `<button class="btn-view" onclick="openViewModal('${b.id}')" title="عرض التفاصيل"><i class="fas fa-eye"></i> عرض</button>`;
        let editBtn = `<button class="btn-edit" onclick="openEditModal('${b.id}')" title="تعديل"><i class="fas fa-edit"></i> تعديل</button>`;
        let deleteBtn = `<button class="btn-delete" onclick="deleteBooking('${b.id}')" title="حذف"><i class="fas fa-trash"></i> حذف</button>`;

        return `
        <tr>
            <td>#${trId}</td>
            <td style="font-weight:bold;">${b.date}</td>
            <td>${typeBadge}</td>
            <td>${b.name}</td>
            <td style="direction:ltr;">${b.phone}</td>
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
    if(b.details && b.details.time) detailsHTML += `<li><strong>الوقت:</strong> ${b.details.time}</li>`;
    if(b.details && b.details.service) detailsHTML += `<li><strong>الخدمة/المناسبة:</strong> ${b.details.service}</li>`;
    if(b.details && b.details.hall) detailsHTML += `<li><strong>الموقع:</strong> ${b.details.hall}</li>`;
    if(b.details && b.details.package) detailsHTML += `<li><strong>الباقة:</strong> ${b.details.package}</li>`;
    
    // Addons
    if(b.details && b.details.has_tables) detailsHTML += `<li><strong>طاولات:</strong> ${b.details.tables_count || 1}</li>`;
    if(b.details && b.details.has_chairs) detailsHTML += `<li><strong>كراسي:</strong> ${b.details.chairs_count || 1}</li>`;
    if(b.details && b.details.has_tea) detailsHTML += `<li><strong>شاي</strong></li>`;
    if(b.details && b.details.has_coffee) detailsHTML += `<li><strong>قهوة</strong></li>`;
    if(b.details && b.details.other_services) detailsHTML += `<li><strong>ملاحظات:</strong> ${b.details.other_services}</li>`;
    detailsHTML += '</ul>';

    let statusStr = b.status || 'pending';
    let statusLabel = 'قيد المراجعة 🕳️';
    if(statusStr === 'approved' || statusStr === 'accepted') statusLabel = 'مقبول ✅';
    if(statusStr === 'rejected') statusLabel = 'مرفوض ❌';

    const formattedId = b.id.toString().substring(b.id.toString().length - 5);
    const modalHtml = `
        <h3 style="color: var(--primary-color); margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">تفاصيل الطلب: #${formattedId}</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #000;">
            <div><strong>الاسم:</strong> ${b.name}</div>
            <div style="direction:ltr;"><strong>الهاتف:</strong> ${b.phone}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 15px; color: #555;">
            <div><strong>تاريخ الحجز:</strong> ${b.date}</div>
            <div><strong>الحالة:</strong> ${statusLabel}</div>
        </div>
        <div style="background: #fdfdfd; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; color: #000;">
            ${detailsHTML}
        </div>
        <div style="display:flex; gap: 10px; margin-top: 20px;">
            <button class="btn-primary" onclick="updateStatus('${b.id}', 'approved')" style="flex:1; background: #28a745;"><i class="fas fa-check"></i> قبول</button>
            <button class="btn-primary" onclick="updateStatus('${b.id}', 'rejected')" style="flex:1; background: #dc3545;"><i class="fas fa-times"></i> رفض</button>
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
        const roleName = u.role === 'superadmin' ? 'مدير عام <i class="fas fa-star" style="color:var(--gold);"></i>' : 'مدير حجوزات';
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
    
    const userData = {
        id: document.getElementById('userIdInput').value,
        username: document.getElementById('userUsername').value,
        name: document.getElementById('userName').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value
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
