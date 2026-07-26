import os
import zipfile
import datetime
import sys

# Ensure stdout/stderr handles Arabic text correctly
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

print("=========================================================")
print("          بدء عملية النسخ الاحتياطي للموقع               ")
print("=========================================================\n")

# 1. Update database.json from Firestore first
try:
    print("⏳ جاري جلب أحدث البيانات من Firestore لتحديث database.json...")
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import firestore_helper as db_helper
    db_helper.load_db('database.json')
    print("✅ تم تحديث ملف database.json المحلي بأحدث البيانات بنجاح.\n")
except Exception as e:
    print(f"⚠️ تحذير: لم نتمكن من تحديث البيانات من Firestore: {e}")
    print("سيتم استخدام البيانات المحلية المتوفرة حالياً.\n")

# 2. Define source and destination paths
source_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

desktop_dir = None
try:
    import winreg
    key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders")
    desktop_dir = winreg.QueryValueEx(key, "Desktop")[0]
except Exception:
    pass

if not desktop_dir or not os.path.exists(desktop_dir):
    desktop_dir = os.path.join(os.path.expanduser('~'), 'Desktop')
if not os.path.exists(desktop_dir):
    desktop_dir = r"C:\Users\DELL\Desktop"

current_date = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
zip_filename = os.path.join(desktop_dir, f"matam_website_backup_{current_date}.zip")

print(f"📁 مجلد المصدر: {source_dir}")
print(f"📦 مسار النسخة الاحتياطية على سطح المكتب: {zip_filename}\n")

# Folders to exclude completely
exclude_folders = {
    '.git',
    '__pycache__',
    '.dart_tool',
    'build', # flutter build
    'node_modules',
    '.idea',
    '.vscode'
}

# Files to exclude
exclude_files = {
    'matam_update_2026.zip',
    'matam_deploy.zip',
    'clean_matam_deploy.zip',
    'matam_update.zip',
}

try:
    print("⏳ جاري أرشفة الملفات...")
    count = 0
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip excluded folders
            dirs[:] = [d for d in dirs if d not in exclude_folders]
            
            for file in files:
                # Skip excluded files
                if file in exclude_files or file.endswith('.pyc') or file.startswith('._'):
                    continue
                
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, source_dir)
                
                # Write to zip
                zipf.write(full_path, relative_path)
                count += 1
                
    print(f"\n🎉 تم إنشاء النسخة الاحتياطية بنجاح!")
    print(f"📦 إجمالي الملفات المؤرشفة: {count}")
    print(f"💾 المسار النهائي: {zip_filename}")
except Exception as e:
    print(f"❌ حدث خطأ أثناء عملية النسخ الاحتياطية: {e}")
