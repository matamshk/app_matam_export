import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import firestore_helper as db_helper

DB_FILE = 'database.json'

# Load current DB to get local database configuration
db = db_helper.load_db(DB_FILE)

# Define the new occasions list for Dhu al-Hijjah 1447 AH
dhu_al_hijjah_occasions = [
    {
        "id": "dh_occ_1",
        "hijri": {
            "month": 12,
            "day": 7
        },
        "title": "استشهاد الإمام محمد الباقر (ع) 114هـ",
        "type": "sad",
        "description": "ذكرى شهادة الإمام محمد بن علي الباقر عليه السلام"
    },
    {
        "id": "dh_occ_2",
        "hijri": {
            "month": 12,
            "day": 8
        },
        "title": "يوم التروية / خروج الإمام الحسين (ع) من مكة إلى العراق",
        "type": "sad",
        "description": "خروج الإمام الحسين عليه السلام من مكة متوجهاً إلى كربلاء"
    },
    {
        "id": "dh_occ_3",
        "hijri": {
            "month": 12,
            "day": 9
        },
        "title": "يوم عرفة / استشهاد مسلم بن عقيل وهانئ بن عروة",
        "type": "sad",
        "description": "يوم عرفة وشهادة مسلم بن عقيل سفير الحسين وهانئ بن عروة في الكوفة عام 60هـ"
    },
    {
        "id": "dh_occ_4",
        "hijri": {
            "month": 12,
            "day": 10
        },
        "title": "عيد الأضحى المبارك",
        "type": "happy",
        "description": "عيد الأضحى المبارك / تبليغ سورة براءة"
    },
    {
        "id": "dh_occ_5",
        "hijri": {
            "month": 12,
            "day": 18
        },
        "title": "عيد الغدير الأغر",
        "type": "happy",
        "description": "تنصيب الإمام علي بن أبي طالب عليه السلام أميراً للمؤمنين عام 10هـ"
    },
    {
        "id": "dh_occ_6",
        "hijri": {
            "month": 12,
            "day": 24
        },
        "title": "يوم المباهلة",
        "type": "happy",
        "description": "ذكرى مباهلة الرسول الأكرم صلى الله عليه وآله لنصارى نجران عام 9هـ"
    },
    {
        "id": "dh_occ_7",
        "hijri": {
            "month": 12,
            "day": 25
        },
        "title": "تصدق الإمام علي (ع) بالخاتم ونزول سورة الدهر",
        "type": "happy",
        "description": "تصدق أمير المؤمنين عليه السلام بالخاتم أثناء الركوع ونزول سورة الإنسان/الدهر في فضل أهل البيت عليهم السلام"
    },
    {
        "id": "dh_occ_8",
        "hijri": {
            "month": 12,
            "day": 28
        },
        "title": "واقعة الحرة واستباحة المدينة المنورة",
        "type": "sad",
        "description": "استباحة الجيش الأموي لمدينة الرسول صلى الله عليه وآله وسلم عام 63هـ"
    }
]

# Update settings
settings_update = {
    "prayer_reference_url": "/uploads/1447121.pdf",
    "prayer_reference_option": "download_only"
}

# 1. Clear previous custom occasions
if db_helper.db_client:
    try:
        print("Clearing occasions from Firestore...")
        docs = db_helper.db_client.collection('custom_occasions').get()
        for doc in docs:
            doc.reference.delete()
        print("Firestore custom_occasions cleared successfully.")
    except Exception as e:
        print("Failed to clear Firestore occasions:", e)

# Clear locally in memory
db['custom_occasions'] = []

# 2. Save new settings
print("Saving settings...")
db_helper.save_settings(settings_update, DB_FILE)

# 3. Save new occasions
print("Saving new occasions...")
for occ in dhu_al_hijjah_occasions:
    db_helper.save_custom_occasion(occ, DB_FILE)

# Reload and verify
updated_db = db_helper.load_db(DB_FILE)
print("Updated database settings:", json.dumps(updated_db.get('settings'), indent=2))
print("Number of custom occasions in database:", len(updated_db.get('custom_occasions', [])))
