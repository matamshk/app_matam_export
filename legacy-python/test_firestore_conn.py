import os
import sys

# Reconfigure stdout/stderr for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

print("=========================================================")
print("      أداة فحص الاتصال بقاعدة بيانات Firestore (Test Tool)")
print("=========================================================\n")

# Check service-account.json
current_dir = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(current_dir, 'service-account.json')

if not os.path.exists(cred_path):
    print("❌ خطأ: ملف 'service-account.json' غير موجود في المجلد الرئيسي!")
    print("👉 لتهيئة الاتصال بقاعدة البيانات السحابية، يرجى:")
    print("  1. الانتقال إلى Firebase Console -> إعدادات المشروع -> حسابات الخدمة (Service Accounts).")
    print("  2. النقر على 'إنشاء مفتاح خاص جديد' (Generate New Private Key) لتنزيل ملف المفتاح.")
    print("  3. إعادة تسمية الملف المنزل إلى 'service-account.json' ووضعه في هذا المجلد.")
    sys.exit(1)

print("✅ تم العثور على ملف 'service-account.json'.")

# Try importing firebase_admin
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    print("✅ مكتبة 'firebase-admin' مثبتة بنجاح.")
except ImportError:
    print("❌ خطأ: مكتبة 'firebase-admin' غير مثبتة!")
    print("👉 يرجى تثبيتها بتشغيل الأمر التالي:")
    print("  pip install firebase-admin")
    sys.exit(1)

# Try initializing connection
try:
    print("⏳ جاري محاولة الاتصال بقاعدة بيانات Firestore...")
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("🔥 تم الاتصال بنجاح بقاعدة بيانات Firebase!")
    
    # Try fetching a small collection
    print("⏳ جاري جلب عينة من الحجوزات (bookings) للتأكد...")
    bookings_ref = db.collection('bookings').limit(3).get()
    
    print("\n-------------------------------------------")
    print(f"📊 نتيجة الفحص: تم العثور على ({len(bookings_ref)}) حجوزات في Firestore.")
    print("-------------------------------------------")
    for doc in bookings_ref:
        data = doc.to_dict()
        print(f"🆔 ID: {doc.id} | الاسم: {data.get('name')} | التاريخ: {data.get('date')} | الحالة: {data.get('status')}")
    print("-------------------------------------------\n")
    
    print("🎉 تم التحقق من سلامة الاتصال وجلب البيانات بنجاح تام!")
except Exception as e:
    print(f"\n❌ فشل الاتصال أو جلب البيانات من Firestore: {e}")
    print("👉 يرجى التأكد من صلاحيات قاعدة البيانات أو صحة ملف service-account.json.")
