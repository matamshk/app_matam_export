/**
 * Database of Hijri Occasions
 * Source of Truth for the application
 */
const occasionsData = [
    {
        "id": "muh_01",
        "hijri": {
            "month": 1,
            "day": 1
        },
        "title": "حادي محرم",
        "type": "religious",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "muh_10",
        "hijri": {
            "month": 1,
            "day": 10
        },
        "title": "عاشوراء",
        "type": "sad",
        "weight": "high",
        "description": ""
    },
    {
        "id": "muh_25",
        "hijri": {
            "month": 1,
            "day": 25
        },
        "title": "استشهاد الإمام السجاد (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_02",
        "hijri": {
            "month": 2,
            "day": 2
        },
        "title": "استشهاد زيد بن علي (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_05",
        "hijri": {
            "month": 2,
            "day": 5
        },
        "title": "وفاة السيدة رقية (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_07",
        "hijri": {
            "month": 2,
            "day": 7
        },
        "title": "استشهاد الإمام الحسن المجتبى (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_17",
        "hijri": {
            "month": 2,
            "day": 17
        },
        "title": "استشهاد الإمام الرضا (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_20",
        "hijri": {
            "month": 2,
            "day": 20
        },
        "title": "ذكرى الأربعين",
        "type": "religious",
        "weight": "high",
        "description": ""
    },
    {
        "id": "saf_23",
        "hijri": {
            "month": 2,
            "day": 23
        },
        "title": "وفاة السيدة فاطمة بنت أسد",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_25",
        "hijri": {
            "month": 2,
            "day": 25
        },
        "title": "وفاة السيدة مريم بنت عمران (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_26",
        "hijri": {
            "month": 2,
            "day": 26
        },
        "title": "استشهاد أولاد مسلم بن عقيل (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_27",
        "hijri": {
            "month": 2,
            "day": 27
        },
        "title": "استشهاد النبي يحيى (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_28",
        "hijri": {
            "month": 2,
            "day": 28
        },
        "title": "وفاة الرسول الأعظم (ص)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "saf_29",
        "hijri": {
            "month": 2,
            "day": 29
        },
        "title": "ذكرى تسقيط الزهراء (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab1_05",
        "hijri": {
            "month": 3,
            "day": 5
        },
        "title": "وفاة السيدة سكينة بنت الحسين (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab1_08",
        "hijri": {
            "month": 3,
            "day": 8
        },
        "title": "استشهاد الإمام الحسن العسكري",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab1_17",
        "hijri": {
            "month": 3,
            "day": 17
        },
        "title": "مولد الرسول (ص) والإمام الصادق (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab2_08",
        "hijri": {
            "month": 4,
            "day": 8
        },
        "title": "مولد الإمام الحسن العسكري (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab2_10",
        "hijri": {
            "month": 4,
            "day": 10
        },
        "title": "وفاة السيدة المعصومة (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "rab2_13",
        "hijri": {
            "month": 4,
            "day": 13
        },
        "title": "استشهاد الزهراء (ع) - رواية",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum1_05",
        "hijri": {
            "month": 5,
            "day": 5
        },
        "title": "مولد السيدة زينب (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum1_13",
        "hijri": {
            "month": 5,
            "day": 13
        },
        "title": "استشهاد السيدة فاطمة الزهراء (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum1_22",
        "hijri": {
            "month": 5,
            "day": 22
        },
        "title": "وفاة القاسم ابن الإمام الكاظم (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum2_03",
        "hijri": {
            "month": 6,
            "day": 3
        },
        "title": "استشهاد الزهراء (ع) - رواية",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum2_13",
        "hijri": {
            "month": 6,
            "day": 13
        },
        "title": "وفاة السيدة أم البنين (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum2_20",
        "hijri": {
            "month": 6,
            "day": 20
        },
        "title": "مولد السيدة فاطمة الزهراء (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "jum2_29",
        "hijri": {
            "month": 6,
            "day": 29
        },
        "title": "وفاة السيد محمد \"سبع الدجيل\"",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_01",
        "hijri": {
            "month": 7,
            "day": 1
        },
        "title": "مولد الإمام محمد الباقر (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_02",
        "hijri": {
            "month": 7,
            "day": 2
        },
        "title": "مولد الإمام علي الهادي (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_03",
        "hijri": {
            "month": 7,
            "day": 3
        },
        "title": "استشهاد الإمام الهادي (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_10",
        "hijri": {
            "month": 7,
            "day": 10
        },
        "title": "مولد الإمام محمد الجواد (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_13",
        "hijri": {
            "month": 7,
            "day": 13
        },
        "title": "مولد الإمام علي (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_15",
        "hijri": {
            "month": 7,
            "day": 15
        },
        "title": "وفاة السيدة زينب (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_25",
        "hijri": {
            "month": 7,
            "day": 25
        },
        "title": "استشهاد الإمام الكاظم (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "raj_27",
        "hijri": {
            "month": 7,
            "day": 27
        },
        "title": "المبعث النبوي الشريف",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "sha_03",
        "hijri": {
            "month": 8,
            "day": 3
        },
        "title": "مولد الإمام الحسين (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "sha_04",
        "hijri": {
            "month": 8,
            "day": 4
        },
        "title": "مولد العباس (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "sha_05",
        "hijri": {
            "month": 8,
            "day": 5
        },
        "title": "مولد الإمام السجاد (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "sha_11",
        "hijri": {
            "month": 8,
            "day": 11
        },
        "title": "مولد الأكبر (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "sha_15",
        "hijri": {
            "month": 8,
            "day": 15
        },
        "title": "مولد الإمام الحجة (عج)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_01",
        "hijri": {
            "month": 9,
            "day": 1
        },
        "title": "غرة شهر رمضان المبارك",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_07",
        "hijri": {
            "month": 9,
            "day": 7
        },
        "title": "وفاة أبوطالب (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_10",
        "hijri": {
            "month": 9,
            "day": 10
        },
        "title": "وفاة السيدة خديجة (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_15",
        "hijri": {
            "month": 9,
            "day": 15
        },
        "title": "مولد الإمام الحسن المجتبى (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_19",
        "hijri": {
            "month": 9,
            "day": 19
        },
        "title": "جرح أمير المؤمنين (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "ram_21",
        "hijri": {
            "month": 9,
            "day": 21
        },
        "title": "استشهاد أمير المؤمنين (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "shw_25",
        "hijri": {
            "month": 10,
            "day": 25
        },
        "title": "استشهاد الإمام جعفر الصادق (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dqv_01",
        "hijri": {
            "month": 11,
            "day": 1
        },
        "title": "مولد السيدة المعصومة",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dqv_11",
        "hijri": {
            "month": 11,
            "day": 11
        },
        "title": "مولد الإمام الرضا (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dqv_29",
        "hijri": {
            "month": 11,
            "day": 29
        },
        "title": "استشهاد الإمام محمد الجواد (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dhj_07",
        "hijri": {
            "month": 12,
            "day": 7
        },
        "title": "استشهاد الإمام محمد الباقر (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dhj_09",
        "hijri": {
            "month": 12,
            "day": 9
        },
        "title": "استشهاد مسلم بن عقيل (ع)",
        "type": "sad",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dhj_18",
        "hijri": {
            "month": 12,
            "day": 18
        },
        "title": "عيد الغدير",
        "type": "happy",
        "weight": "high",
        "description": ""
    },
    {
        "id": "dhj_20",
        "hijri": {
            "month": 12,
            "day": 20
        },
        "title": "مولد الإمام الكاظم (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    },
    {
        "id": "dhj_24",
        "hijri": {
            "month": 12,
            "day": 24
        },
        "title": "المباهلة وتصدق الإمام علي (ع)",
        "type": "happy",
        "weight": "medium",
        "description": ""
    }
];

// Helper to get events by hijri month index (1-12)
function getEventsByMonth(hijriMonth) {
    return occasionsData.filter(e => e.hijri.month === hijriMonth).sort((a, b) => a.hijri.day - b.hijri.day);
}

// Arabic Month Names
const hijriMonths = [
    "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];
