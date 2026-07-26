import json
import re
import sys
import os
import datetime

# Ensure stdout handles Arabic correctly
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

print("=========================================================")
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firestore_helper as db_helper
DB_FILE = 'database.json'
FLUTTER_DB_FILE = os.path.join('matam_flutter', 'assets', 'www', 'database.json')

# 1. Paths
downloads_path = r"C:\Users\DELL\Downloads\تقويم-مأتم-أبو-صيبع-الشرقي-1448.json"
uploads_dir = 'uploads'
dest_json_path = os.path.join(uploads_dir, 'تقويم-مأتم-أبو-صيبع-الشرقي-1448.json')

if not os.path.exists(downloads_path):
    print(f"❌ خطأ: لم يتم العثور على ملف التقويم في التحميلات: {downloads_path}")
    sys.exit(1)

# Ensure uploads directory exists
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)

# Copy the file to uploads
import shutil
shutil.copy2(downloads_path, dest_json_path)
print(f"✅ تم نسخ ملف التقويم إلى مجلد المرفوعات: {dest_json_path}")

# Load the calendar JSON
with open(downloads_path, 'r', encoding='utf-8') as f:
    calendar_data = json.load(f)

# Arabic month mapping
arabic_months = {
    'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
    'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
    'يونيه': 6, 'يوليه': 7, 'اكتوبر': 10
}

weekday_map = {
    0: 'الاثنين', 1: 'الثلاثاء', 2: 'الأربعاء', 3: 'الخميس', 4: 'الجمعة', 5: 'السبت', 6: 'الأحد'
}

exclude_keywords = ['تقويم', 'البحرين', 'أٔقاث', 'مغرب', 'ظهر', 'شروق', 'فجر', 'الـمــنـاس', 'انعاليت', 'صانحت', 'ثبٕث انٓالل']

def clean_event_text(text):
    if not text:
        return ""
    parts = text.split('|')
    clean_parts = []
    calendar_keywords = [
        'حقٕٚى', 'تقويم', 'إٚشاٌ', 'إيران', 'ٔيٕاقٛج', 'مواقيت', 'أوقات', 'أٔقاث',
        'األْهت', 'الأهلة', 'أٔل انشٓش', 'أول الشهر', 'انعجٛة٘', 'العجيري', 'العجير',
        'نهُجف', 'للنجف', 'السيستاني', 'الخامنئي', 'فضل الله', 'الخامُئٙ', 'انغٛسخاَٙ',
        'انخٓش', 'أٔل', 'انعذد', 'جشٚت', 'صُت', 'البحرين', 'سرتة', 'السندي', 'الـمــنـاس'
    ]
    for p in parts:
        p = p.strip()
        if len(p) <= 2:
            continue
        if any(kw in p for kw in calendar_keywords):
            continue
        p = p.replace('', '').strip()
        p = re.sub(r'^\s*-\s*', '', p)
        clean_parts.append(p)
    return ' | '.join(clean_parts).strip()

def subtract_minutes(time_str, minutes):
    h, m = map(int, time_str.split(':'))
    total_minutes = h * 60 + m - minutes
    new_h = (total_minutes // 60) % 24
    new_m = total_minutes % 60
    return f"{new_h}:{new_m:02d}"

prayer_calendar_database = {}
parsed_occasions = []

print("⏳ جاري تحليل مواقيت الصلاة والمناسبات من ملف الـ JSON...")

for m_idx, month in enumerate(calendar_data['months']):
    month_num_hijri = month['month_number']
    month_name_hijri = month['month_name_ar']
    
    range_parts = []
    for r in month['gregorian_range']:
        parts = r.strip().split()
        m_name = parts[0]
        year = int(parts[1])
        m_num = next((v for k, v in arabic_months.items() if k in m_name), None)
        range_parts.append((m_num, year))
        
    active_greg_month, active_greg_year = range_parts[0]
    lines = month['content_text'].split('\n')
    
    pending_event_lines = []
    
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean:
            continue
            
        times = re.findall(r'\d{1,2}:\s*\d{2}', line_clean)
        
        # Check if it has enough times to be a prayer day
        if len(times) < 4:
            if not any(k in line_clean for k in exclude_keywords):
                pending_event_lines.append(line_clean)
            continue
            
        # Determine times
        if month_num_hijri == 9 and len(times) >= 5:
            # Ramadan
            maghrib, dhuhr, sunrise, fajr = times[0], times[1], times[2], times[3]
            last_time = times[4]
        else:
            maghrib, dhuhr, sunrise, fajr = times[-4], times[-3], times[-2], times[-1]
            last_time = times[-1]
            
        idx = line_clean.rfind(last_time)
        suffix = line_clean[idx + len(last_time):].strip()
        suffix_clean = re.sub(r'\d*:\s*\d*', '', suffix).strip()
        nums = re.findall(r'\d+', suffix_clean)
        
        if len(nums) >= 2:
            if len(nums) == 3:
                active_greg_month = int(nums[1])
                if active_greg_month == range_parts[1][0]:
                    active_greg_year = range_parts[1][1]
                greg_day = int(nums[0])
                hijri_day = int(nums[2])
            else:
                greg_day = int(nums[0])
                hijri_day = int(nums[1])
                
            try:
                dt = datetime.date(active_greg_year, active_greg_month, greg_day)
                greg_date = f"{active_greg_year:04d}-{active_greg_month:02d}-{greg_day:02d}"
                day_name = weekday_map[dt.weekday()]
            except ValueError:
                # Fallback on date parse failure
                continue
            
            # Marriage symbol
            marriage_symbols = ['✓', '×', '&']
            marriage_status = ""
            for s in marriage_symbols:
                if s in suffix:
                    marriage_status = s
                    break
                    
            # Parse inline event text
            event_text_inline = line_clean[:line_clean.find(times[0])].strip()
            
            all_event_parts = []
            for pel in pending_event_lines:
                all_event_parts.append(pel)
            if event_text_inline and not any(k in event_text_inline for k in exclude_keywords):
                all_event_parts.append(event_text_inline)
                
            event_text = ' | '.join(all_event_parts).strip()
            event_text = re.sub(r'\s+', ' ', event_text)
            clean_event = clean_event_text(event_text)
            
            pending_event_lines = [] # reset
            
            sunset = subtract_minutes(maghrib, 15)
            midnight = dhuhr
            
            # Store in database structure
            prayer_calendar_database[greg_date] = {
                "hijri_day": hijri_day,
                "hijri_month": month_num_hijri,
                "hijri_year": 1448,
                "day_name_ar": day_name,
                "fajr": fajr,
                "sunrise": sunrise,
                "dhuhr": dhuhr,
                "sunset": sunset,
                "maghrib": maghrib,
                "midnight": midnight,
                "marriage": marriage_status,
                "event": clean_event
            }
            
            # Create parsed occasion
            if clean_event:
                occ_id = f"occ_1448_{month_num_hijri}_{hijri_day}_{greg_day}"
                is_sad = any(k in clean_event for k in ['وفاة', 'استشهاد', 'شهادة', 'هدم', 'عاشوراء', 'وفاة'])
                is_happy = any(k in clean_event for k in ['ولادة', 'ميلاد', 'عيد', 'تنصيب', 'فرح'])
                occ_type = 'sad' if is_sad else 'happy' if is_happy else 'custom'
                
                parsed_occasions.append({
                    "id": occ_id,
                    "title": clean_event,
                    "hijri": {
                        "month": month_num_hijri,
                        "day": hijri_day
                    },
                    "type": occ_type,
                    "description": clean_event,
                    "isCustom": True
                })

print(f"✅ تم تحليل {len(prayer_calendar_database)} يوماً بنجاح.")
print(f"✅ تم العثور على {len(parsed_occasions)} مناسبات دينية معتمدة.")

# 2. Update database.json
print("\n⏳ جاري كتابة البيانات لملفات قاعدة البيانات...")
local_db = db_helper.load_db(DB_FILE)

# Set settings
if 'settings' not in local_db:
    local_db['settings'] = {}

local_db['settings']['prayer_calendar_database'] = prayer_calendar_database
local_db['settings']['prayer_reference_url'] = f"/uploads/تقويم-مأتم-أبو-صيبع-الشرقي-1448.json"
local_db['settings']['prayer_reference_option'] = "apply_offsets"
local_db['settings']['whatsapp_phone'] = "97334195510+" # from organization phone in json

# Clear old custom occasions in memory and add new ones
local_db['custom_occasions'] = parsed_occasions

# Save locally
db_helper.save_local_db(local_db, DB_FILE)
db_helper.save_local_db(local_db, FLUTTER_DB_FILE)
print("✅ تم تحديث ملف database.json المحلي وأصول فلاتر بنجاح.")

# 3. Save to Firestore (Upload)
if db_helper.db_client:
    try:
        print("\n⏳ جاري مزامنة ورفع البيانات الجديدة إلى قاعدة بيانات Firestore السحابية...")
        
        # Save settings
        db_helper.save_settings(local_db['settings'], DB_FILE)
        
        # Clear previous occasions from firestore first
        print("⏳ جاري تنظيف المناسبات السابقة في Firestore...")
        docs = db_helper.db_client.collection('custom_occasions').get()
        for doc in docs:
            doc.reference.delete()
            
        # Upload new occasions
        print(f"⏳ جاري رفع {len(parsed_occasions)} مناسبات إلى Firestore...")
        for occ in parsed_occasions:
            db_helper.save_custom_occasion(occ, DB_FILE)
            
        print("🔥 تم رفع ومزامنة مواقيت الصلاة والمناسبات الجديدة إلى Firestore بنجاح!")
    except Exception as e:
        print(f"⚠️ فشل الرفع التلقائي إلى Firestore: {e}")
else:
    print("\nℹ️ خيار المزامنة السحابية غير نشط (تشغيل في الوضع المحلي).")

# 4. Regenerate backup on Desktop
print("\n⏳ جاري تحديث ملف النسخة الاحتياطية على سطح المكتب...")
try:
    import subprocess
    subprocess.run([sys.executable, 'scratch/backup_to_desktop.py'], check=True)
    print("✅ تم تحديث النسخة الاحتياطية بنجاح.")
except Exception as e:
    print(f"⚠️ تحذير: فشل تحديث النسخة الاحتياطية: {e}")

print("\n🎉 تم إنجاز المهمة بنجاح تام!")
