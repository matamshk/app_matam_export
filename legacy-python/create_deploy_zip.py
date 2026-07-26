import os
import zipfile
import sys

# Reconfigure stdout/stderr to prevent charmap/UnicodeEncodeError on Windows when printing Arabic text
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

print("=========================================================")
print("      أداة إنشاء ملف النشر المضغوط (Deploy Zip Tool)     ")
print("=========================================================\n")

current_dir = os.path.dirname(os.path.abspath(__file__))
zip_filename = os.path.join(current_dir, 'matam_update_2026.zip')

# Folders and files to include
folders_to_include = ['css', 'js', 'uploads']
files_to_include = [
    'server.py',
    'flask_app.py',
    'firestore_helper.py',
    'migrate_to_firestore.py',
    'database.json',
    'awqaf.html',
    'booking-matem.html',
    'booking-speaker.html',
    'celebrations.html',
    'contribution.html',
    'dashboard.html',
    'index.html',
    'login.html',
    'occasions.html',
    'requirements.txt',
    'passenger_wsgi.py'
]

try:
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 1. Add files in root
        for file in files_to_include:
            file_path = os.path.join(current_dir, file)
            if os.path.exists(file_path):
                print(f"➕ إضافة ملف: {file}")
                zipf.write(file_path, file)
            else:
                print(f"⚠️ تحذير: الملف {file} غير موجود، سيتم تخطيه.")

        # 2. Add directories
        for folder in folders_to_include:
            folder_path = os.path.join(current_dir, folder)
            if os.path.exists(folder_path):
                print(f"📂 إضافة مجلد: {folder}/")
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        # Skip temporary pyc files or hidden files
                        if file.endswith('.pyc') or file.startswith('._'):
                            continue
                        full_path = os.path.join(root, file)
                        relative_path = os.path.relpath(full_path, current_dir)
                        zipf.write(full_path, relative_path)
            else:
                print(f"⚠️ تحذير: المجلد {folder} غير موجود، سيتم تخطيه.")
                
    print("\n🎉 تم إنشاء الملف المضغوط بنجاح!")
    print(f"📦 المسار: {zip_filename}")
except Exception as e:
    print(f"❌ حدث خطأ أثناء إنشاء الملف المضغوط: {e}")
