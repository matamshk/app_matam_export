import os
import json
import sys

# Reconfigure output for Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

print("=========================================================")
print("  أداة نقل البيانات المحلية إلى Firestore (Migration Tool)")
print("=========================================================\n")

# Check service-account.json
current_dir = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(current_dir, 'service-account.json')
db_path = os.path.join(current_dir, 'database.json')

if not os.path.exists(cred_path):
    print("❌ خطأ: ملف 'service-account.json' غير موجود في المجلد الرئيسي!")
    print("👉 يرجى وضعه أولاً ثم تشغيل هذا السكربت لنقل البيانات.")
    sys.exit(1)

if not os.path.exists(db_path):
    print("❌ خطأ: ملف البيانات المحلي 'database.json' غير موجود!")
    sys.exit(1)

# Initialize Firebase
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ خطأ: مكتبة 'firebase-admin' غير مثبتة! يرجى تشغيل: pip install firebase-admin")
    sys.exit(1)

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db_client = firestore.client()
    print("🔥 تم الاتصال بقاعدة بيانات Firestore بنجاح.")
except Exception as e:
    print(f"❌ فشل الاتصال بقاعدة البيانات: {e}")
    sys.exit(1)

# Load local data
try:
    with open(db_path, 'r', encoding='utf-8') as f:
        local_db = json.load(f)
    print("✅ تم قراءة ملف 'database.json' المحلي بنجاح.")
except Exception as e:
    print(f"❌ فشل قراءة الملف المحلي: {e}")
    sys.exit(1)

# Migrate data
try:
    # 1. Migrate Bookings
    bookings = local_db.get('bookings', [])
    print(f"⏳ جاري رفع الحجوزات ({len(bookings)})...")
    for b in bookings:
        doc_id = str(b.get('id'))
        # Remove id from inside if we store it as document ID, but keeping it is fine
        db_client.collection('bookings').document(doc_id).set({
            'name': b.get('name', ''),
            'phone': b.get('phone', ''),
            'date': b.get('date', ''),
            'occasion': b.get('occasion', ''),
            'notes': b.get('notes', ''),
            'status': b.get('status', 'pending'),
            'details': b.get('details', {})
        }, merge=True)

    # 2. Migrate Custom Occasions
    occasions = local_db.get('custom_occasions', [])
    print(f"⏳ جاري رفع المناسبات المخصصة ({len(occasions)})...")
    for o in occasions:
        doc_id = str(o.get('id'))
        db_client.collection('custom_occasions').document(doc_id).set({
            'title': o.get('title', ''),
            'hijri': o.get('hijri', {}),
            'type': o.get('type', 'custom'),
            'description': o.get('description', ''),
            'isCustom': o.get('isCustom', True)
        }, merge=True)

    # 3. Migrate Contributions
    contributions = local_db.get('contributions', [])
    print(f"⏳ Gجاري رفع المساهمات ({len(contributions)})...")
    for c in contributions:
        doc_id = str(c.get('id'))
        db_client.collection('contributions').document(doc_id).set({
            'sender_name': c.get('sender_name') or c.get('donor_name') or '',
            'sender_phone': c.get('sender_phone') or c.get('phone') or '',
            'total_amount': c.get('total_amount') or c.get('amount') or 0.0,
            'hijri_month': c.get('hijri_month', ''),
            'occasion': c.get('occasion', ''),
            'receipt_image': c.get('receipt_image'),
            'deceased_list': c.get('deceased_list', []),
            'status': c.get('status', 'pending'),
            'date': c.get('date', '')
        }, merge=True)

    # 4. Migrate Settings
    settings = local_db.get('settings', {})
    if settings:
        print("⏳ جاري رفع الإعدادات العامة...")
        db_client.collection('metadata').document('settings').set(settings, merge=True)

    # 5. Migrate Hijri Offset
    hijri_offset = local_db.get('hijri_offset', 0)
    print(f"⏳ جاري رفع إزاحة التاريخ الهجري ({hijri_offset})...")
    db_client.collection('metadata').document('hijri').set({'offset': hijri_offset}, merge=True)

    # 6. Migrate Users
    users = local_db.get('users', [])
    print(f"⏳ جاري رفع حسابات المستخدمين ({len(users)})...")
    for u in users:
        doc_id = str(u.get('id'))
        db_client.collection('users').document(doc_id).set({
            'username': u.get('username', ''),
            'password': u.get('password', ''),
            'name': u.get('name', ''),
            'role': u.get('role', 'user'),
            'permissions': u.get('permissions', {})
        }, merge=True)

    print("\n🎉 تم رفع كافة البيانات المحلية إلى قاعدة بيانات Firestore السحابية بنجاح تام!")
    print("👉 الآن يمكنك تشغيل الخادم والاتصال بالهاتف دون القلق من فقدان أي بيانات.")
except Exception as e:
    print(f"\n❌ حدث خطأ أثناء رفع البيانات: {e}")
