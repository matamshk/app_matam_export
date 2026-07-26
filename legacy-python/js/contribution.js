/**
 * Logic for Deceased Contribution Page
 */

const DEFAULT_PRICE = 5;
let pricePerPerson = DEFAULT_PRICE;
let deceasedCount = 0;
let customOccasions = [];

document.addEventListener('DOMContentLoaded', () => {
    // Load dynamic price
    try {
        const settings = JSON.parse(localStorage.getItem('site_settings') || '{}');
        if (settings.contribution_price) {
            pricePerPerson = parseInt(settings.contribution_price);
            const priceEl = document.getElementById('pricePerPerson');
            if (priceEl) priceEl.textContent = pricePerPerson + ' د.ب';
        }
    } catch(e) {}

    // Initial row
    addDeceasedRow();
    
    // Fetch custom occasions from server to populate dropdown
    fetchOccasions();

    const monthSelect = document.getElementById('hijriMonthSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', updateOccasionsDropdown);
    }

    const form = document.getElementById('contributionForm');
    if (form) {
        form.addEventListener('submit', submitContribution);
    }
});

function addDeceasedRow() {
    deceasedCount++;
    const container = document.getElementById('deceasedContainer');
    
    const rowId = `deceased_row_${deceasedCount}`;
    const rowHTML = `
        <div class="deceased-row" id="${rowId}">
            ${deceasedCount > 1 ? `<button type="button" class="remove-row-btn" onclick="removeDeceasedRow('${rowId}')"><i class="fas fa-trash"></i> حذف</button>` : ''}
            <div class="form-group" style="margin-top: ${deceasedCount > 1 ? '20px' : '0'};">
                <label>اسم المرحوم/المرحومة (${deceasedCount})</label>
                <input type="text" class="deceased-name-input" required placeholder="أدخل اسم المرحوم ثلاثي">
            </div>
            <div class="form-group">
                <label>صورة المرحوم (اختياري)</label>
                <div class="file-upload-wrapper">
                    <button type="button" class="file-upload-btn"><i class="fas fa-image"></i> اختر صورة للمرحوم (PNG, JPEG, PDF)</button>
                    <input type="file" class="deceased-photo-input" accept="image/png, image/jpeg, application/pdf" onchange="updateFileName(this, 'photoName_${rowId}')">
                </div>
                <span id="photoName_${rowId}" class="file-name-display">لم يتم اختيار ملف (الصيغ المقبولة: PNG, JPEG, PDF)</span>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHTML);
    updateTotal();
}

function removeDeceasedRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updateTotal();
    }
}

function updateFileName(inputElement, displayId) {
    const display = document.getElementById(displayId);
    if (inputElement.files && inputElement.files.length > 0) {
        display.textContent = inputElement.files[0].name;
    } else {
        display.textContent = 'لم يتم اختيار ملف';
    }
}

function updateTotal() {
    // Count current rows
    const rows = document.querySelectorAll('.deceased-row').length;
    const total = rows * pricePerPerson;
    document.getElementById('totalAmount').textContent = total;
}

async function fetchOccasions() {
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            const data = await res.json();
            customOccasions = data.custom_occasions || [];
        }
    } catch (e) {
        console.error("Failed to load occasions");
    }
}

function updateOccasionsDropdown() {
    const month = parseInt(document.getElementById('hijriMonthSelect').value);
    const container = document.getElementById('occasionsContainer');
    const select = document.getElementById('occasionSelect');
    
    if (!month) {
        container.style.display = 'none';
        return;
    }

    // Filter occasions for the selected month
    const monthOccasions = customOccasions.filter(o => o.hijri && o.hijri.month === month);
    
    // Clear current options
    select.innerHTML = '<option value="">-- اختر المناسبة --</option>';
    
    // Default religious occasions fallback if none found
    if (monthOccasions.length === 0) {
        select.innerHTML += `<option value="عامة">مناسبة عامة في هذا الشهر</option>`;
        select.innerHTML += `<option value="وفيات">إهداء لأرواح المؤمنين والمؤمنات</option>`;
    } else {
        monthOccasions.forEach(occ => {
            select.innerHTML += `<option value="${occ.title}">${occ.title}</option>`;
        });
        select.innerHTML += `<option value="عامة">مناسبة عامة أخرى</option>`;
    }
    
    container.style.display = 'block';
}

// Convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function submitContribution(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    submitBtn.disabled = true;

    try {
        // Collect basic data
        const payload = {
            id: 'cont_' + Date.now(),
            date: new Date().toLocaleDateString('en-GB'),
            timestamp: Date.now(),
            sender_name: document.getElementById('senderName').value,
            sender_phone: document.getElementById('senderPhone').value,
            hijri_month: document.getElementById('hijriMonthSelect').value,
            occasion: document.getElementById('occasionSelect').value,
            total_amount: parseInt(document.getElementById('totalAmount').textContent),
            deceased_list: [],
            receipt_image: null
        };

        // Collect Deceased Rows
        const rows = document.querySelectorAll('.deceased-row');
        for (let row of rows) {
            const name = row.querySelector('.deceased-name-input').value;
            const fileInput = row.querySelector('.deceased-photo-input');
            let photoBase64 = null;
            
            if (fileInput.files && fileInput.files.length > 0) {
                photoBase64 = await fileToBase64(fileInput.files[0]);
            }
            
            payload.deceased_list.push({
                name: name,
                photo: photoBase64
            });
        }

        // Collect Receipt Image
        const receiptInput = document.getElementById('benefitReceipt');
        if (receiptInput.files && receiptInput.files.length > 0) {
            payload.receipt_image = await fileToBase64(receiptInput.files[0]);
        } else {
            throw new Error("يجب إرفاق صورة الدفع");
        }

        // Send to server
        const res = await fetch('/api/save_contribution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            // Build dynamic receipt
            const monthsNames = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
            const hMonthName = monthsNames[parseInt(payload.hijri_month) - 1] || payload.hijri_month;
            const deceasedNames = payload.deceased_list.map(d => d.name).join('، ');
            
            // Build WhatsApp Sharing Text
            let waText = `السلام عليكم\n*إيصال استلام مساهمة للمرحومين - بوابة مأتم أبو صيبع الشرقي*\n\n`;
            waText += `*رقم الإيصال:* #${payload.id.replace('cont_', '').substring(0, 8)}\n`;
            waText += `*التاريخ:* ${payload.date}\n`;
            waText += `*اسم المساهم:* ${payload.sender_name}\n`;
            waText += `*رقم الهاتف:* ${payload.sender_phone}\n`;
            waText += `*المناسبة المختصة:* ${payload.occasion || 'عامة'} (${hMonthName})\n\n`;
            waText += `*أسماء المرحومين المهدى لهم الثواب:*\n`;
            payload.deceased_list.forEach((d, i) => {
                waText += `${i+1}. ${d.name}\n`;
            });
            waText += `\n*المبلغ المستلم:* ${payload.total_amount} د.ب\n`;
            waText += `*الحالة:* تم استلام المساهمة وإيصال التحويل بنجاح ✅\n\n`;
            waText += `رحم الله موتاكم وموتى المؤمنين والمؤمنات وجعلها الله في ميزان حسناتكم. نسألكم الدعاء.`;
            const waLink = "https://api.whatsapp.com/send?text=" + encodeURIComponent(waText);
            
            const receiptHTML = `
                <div class="receipt-card" style="background: #ffffff; color: #1a1a1a; padding: 25px; border-radius: 12px; text-align: right; box-shadow: 0 4px 15px rgba(0,0,0,0.15); border: 2px solid var(--primary-color);">
                    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #ddd; padding-bottom: 15px;">
                        <i class="fas fa-mosque" style="font-size: 2.5rem; color: #1E3C72; margin-bottom: 10px;"></i>
                        <h2 style="color: #1E3C72; font-size: 1.4rem; margin: 0; font-family: 'Tajawal', sans-serif;">بوابة مأتم أبو صيبع الشرقي</h2>
                        <span style="font-size: 0.85rem; color: #666;">إيصال استلام مساهمة للمرحومين</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; color: #555;">
                        <span>رقم الإيصال: <strong style="font-family: monospace; color: #111;">#${payload.id.replace('cont_', '').substring(0, 8)}</strong></span>
                        <span>التاريخ: <strong style="color: #111;">${payload.date}</strong></span>
                    </div>
                    
                    <div style="background: #fcfbf7; border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <strong>اسم المساهم:</strong> <span style="color: #333;">${payload.sender_name}</span>
                        </div>
                        <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <strong>رقم الهاتف:</strong> <span style="color: #333; direction: ltr; display: inline-block;">${payload.sender_phone}</span>
                        </div>
                        <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <strong>المناسبة المختصة:</strong> <span style="color: #333;">${payload.occasion || 'عامة'} (${hMonthName})</span>
                        </div>
                        <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                            <strong>أسماء المرحومين:</strong> <span style="color: #555; line-height: 1.5;">${deceasedNames}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: bold; padding-top: 5px; color: #2e7d32;">
                            <span>المبلغ الإجمالي المستلم:</span>
                            <span>${payload.total_amount} د.ب</span>
                        </div>
                    </div>
                    
                    <div style="text-align: center; background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; padding: 10px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; font-size: 0.95rem;">
                        <i class="fas fa-check-circle"></i> تم استلام المساهمة وإيصال التحويل بنجاح
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" onclick="window.printReceipt()" class="btn" style="flex: 1; background: #1E3C72; color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Tajawal'; min-width: 120px;">
                            <i class="fas fa-print"></i> طباعة الإيصال
                        </button>
                        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn" style="flex: 1; background: #25d366; color: #fff; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Tajawal'; text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 120px;">
                            <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> مشاركة واتساب
                        </a>
                        <button type="button" onclick="window.location.href='index.html'" class="btn" style="flex: 1; background: #fdfcf8; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Tajawal'; min-width: 120px;">
                            العودة للرئيسية
                        </button>
                    </div>
                </div>
            `;
            
            // Set modal style and content
            const successBox = document.querySelector('#successModal .modal-box');
            if (successBox) {
                successBox.style.background = 'transparent';
                successBox.style.border = 'none';
                successBox.style.boxShadow = 'none';
                successBox.style.padding = '0';
                successBox.innerHTML = receiptHTML;
            }
            
            // Define print function dynamically
            window.printReceipt = function() {
                const printWin = window.open('', '', 'width=600,height=800');
                printWin.document.write(`
                    <html>
                    <head>
                        <title>إيصال مساهمة للمرحومين - مأتم أبو صيبع الشرقي</title>
                        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                        <style>
                            body { font-family: 'Tajawal', sans-serif; direction: rtl; padding: 30px; background: #f9f9f9; }
                            .print-container { background: white; border: 2px solid #d4af37; border-radius: 12px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            ${receiptHTML.substring(0, receiptHTML.indexOf('<div style="display: flex; gap: 10px;'))}
                            <div style="text-align: center; margin-top: 30px; font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 15px;">
                                بوابة مأتم أبو صيبع الشرقي الإلكترونية - نسألكم الدعاء
                            </div>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            }
                        <\/script>
                    </body>
                    </html>
                `);
                printWin.document.close();
            };
            
            document.getElementById('successModal').style.display = 'flex';
        } else {
            alert('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
        }

    } catch (err) {
        alert(err.message || 'حدث خطأ في النظام.');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال المساهمة';
        submitBtn.disabled = false;
    }
}
