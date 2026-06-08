import os
import json
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer
import urllib.parse
import firestore_helper as db_helper

# Reconfigure stdout/stderr to prevent charmap/UnicodeEncodeError on Windows when printing Arabic text
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

# Set working directory to the script's location
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Path to the JSON database
DB_FILE = 'database.json'

# Simple Authentication
ADMIN_PASSWORD = 'admin123'
ADMIN_TOKEN = 'secure_admin_token_2026_xyz'

def load_db():
    return db_helper.load_db(DB_FILE)

def save_db(data):
    db_helper.save_local_db(data, DB_FILE)

def trigger_auto_sync(action, db_data):
    settings = db_data.get('settings', {})
    google_url = settings.get('google_webapp_url', '')
    if not google_url:
        return
        
    payload = {
        "action": action,
        "bookings": db_data.get('bookings', []),
        "contributions": db_data.get('contributions', []),
        "custom_occasions": db_data.get('custom_occasions', []),
        "users": db_data.get('users', [])
    }
    
    import threading
    def send_request():
        try:
            import urllib.request
            req = urllib.request.Request(
                google_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=20) as response:
                pass # Silent background sync success
        except Exception as e:
            print(f"Auto-sync ({action}) failed: {e}")
            
    threading.Thread(target=send_request).start()

class CustomAPIHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching of API and HTML
        if self.path.startswith('/api/') or self.path.endswith('.html') or self.path.endswith('.js'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path.startswith('/api/data'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            db = load_db()
            self.wfile.write(json.dumps(db).encode('utf-8'))
        else:
            # Fallback to serving static files
            super().do_GET()

    def do_POST(self):
        # Parse content length
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        db = load_db()

        if self.path == '/api/save_booking':
            db_helper.save_booking(payload, DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_bookings", db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/save_custom_occasion':
            db_helper.save_custom_occasion(payload, DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_occasions", db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/save_contribution':
            import base64
            import time
            import uuid
            import copy
            
            # Create a deep copy of the raw payload with base64 images for Google Sync
            google_payload = copy.deepcopy(payload)
            
            upload_dir = 'uploads'
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir)
                
            def save_b64_image(b64_string, prefix):
                if not b64_string: return None
                try:
                    if "," in b64_string:
                        header, encoded = b64_string.split(",", 1)
                    else:
                        header, encoded = "", b64_string
                    
                    ext = "png"
                    if header and ";" in header:
                        part0 = header.split(';')[0]
                        if "/" in part0:
                            ext = part0.split('/')[1]
                    
                    filename = f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:6]}.{ext}"
                    filepath = os.path.join(upload_dir, filename)
                    with open(filepath, "wb") as fh:
                        fh.write(base64.b64decode(encoded))
                    return f"uploads/{filename}"
                except Exception as e:
                    print("Error saving image:", e)
                    return None

            # Process receipt
            if payload.get('receipt_image'):
                payload['receipt_image'] = save_b64_image(payload['receipt_image'], 'receipt')
                
            # Process deceased photos
            if 'deceased_list' in payload:
                for idx, dec in enumerate(payload['deceased_list']):
                    if dec.get('photo'):
                        dec['photo'] = save_b64_image(dec['photo'], f'deceased_{idx}')
            
            # Prepend to DB
            payload['status'] = 'pending'
            db_helper.save_contribution(payload, DB_FILE)
            db = db_helper.load_db(DB_FILE)
            
            # Sync to Google Sheets & Drive via Web App if configured
            settings = db.get('settings', {})
            google_url = settings.get('google_webapp_url', '')
            if google_url:
                try:
                    import urllib.request
                    google_payload['id'] = payload['id']
                    req = urllib.request.Request(
                        google_url,
                        data=json.dumps(google_payload).encode('utf-8'),
                        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
                    )
                    with urllib.request.urlopen(req, timeout=20) as response:
                        res_body = response.read().decode('utf-8')
                        print("Google Apps Script response:", res_body)
                except Exception as google_err:
                    print("Error syncing contribution to Google Sheets/Drive:", google_err)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/export_full_database':
            token = payload.get('token')
            if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
                settings = db.get('settings', {})
                google_url = settings.get('google_webapp_url', '')
                if not google_url:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "رابط المزامنة السحابي (Google Web App URL) غير مدخل."}).encode('utf-8'))
                    return
                
                export_payload = {
                    "action": "export_all",
                    "bookings": db.get('bookings', []),
                    "contributions": db.get('contributions', []),
                    "custom_occasions": db.get('custom_occasions', []),
                    "users": db.get('users', [])
                }
                
                try:
                    import urllib.request
                    req = urllib.request.Request(
                        google_url,
                        data=json.dumps(export_payload).encode('utf-8'),
                        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
                    )
                    with urllib.request.urlopen(req, timeout=30) as response:
                        res_body = response.read().decode('utf-8')
                        print("Google Apps Script export response:", res_body)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                except Exception as err:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": f"فشل تصدير البيانات إلى جوجل: {err}"}).encode('utf-8'))
            else:
                self.send_response(403)
                self.end_headers()

        elif self.path == '/api/save_offset':
            db_helper.save_offset(payload.get('offset', 0), DB_FILE)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/update_booking_status':
            booking_id = payload.get('id')
            new_status = payload.get('status')
            db_helper.update_booking_status(booking_id, new_status, DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_bookings", db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/delete_booking':
            booking_id = payload.get('id')
            db_helper.delete_booking(booking_id, DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_bookings", db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/edit_booking':
            booking_id = payload.get('id')
            db_helper.edit_booking(booking_id, payload.get('name'), payload.get('phone'), payload.get('date'), DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_bookings", db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/save_settings':
            db_helper.save_settings(payload.get('settings', {}), DB_FILE)
            db = db_helper.load_db(DB_FILE)
            trigger_auto_sync("sync_users", db) # Also sync settings/users
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))

        elif self.path == '/api/upload_prayer_reference':
            token = payload.get('token')
            is_authorized = True
            if token and 'sessions' in db:
                session = db['sessions'].get(token)
                if not session:
                    is_authorized = False
            
            if not is_authorized:
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Unauthorized"}).encode('utf-8'))
                return
                
            file_data = payload.get('file_data')
            filename = payload.get('filename')
            update_option = payload.get('update_option', 'download_only')
            
            if not file_data or not filename:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Missing file_data or filename"}).encode('utf-8'))
                return
                
            file_url = db_helper.save_prayer_reference(file_data, filename, update_option, DB_FILE)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success", "file_url": file_url}).encode('utf-8'))


        elif self.path == '/api/login':
            import uuid
            username = payload.get('username')
            password = payload.get('password')
            user = next((u for u in db['users'] if u.get('username') == username and u.get('password') == password), None)
            
            if user:
                token = uuid.uuid4().hex
                db_helper.save_session(token, {"user_id": user['id'], "role": user['role'], "name": user['name']}, DB_FILE)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "token": token, "role": user['role'], "name": user['name']}).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Invalid password"}).encode('utf-8'))

        elif self.path == '/api/verify':
            token = payload.get('token')
            if token in db['sessions']:
                user_info = db['sessions'][token]
                user = next((u for u in db['users'] if u.get('id') == user_info['user_id']), None)
                perms = user.get('permissions', {}) if user else {}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "role": user_info['role'], "name": user_info.get('name'), "permissions": perms}).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error"}).encode('utf-8'))
                
        elif self.path == '/api/get_users':
            token = payload.get('token')
            if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
                safe_users = [{"id": u.get("id"), "username": u.get("username"), "name": u.get("name", ""), "role": u.get("role"), "permissions": u.get("permissions", {})} for u in db['users']]
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "users": safe_users}).encode('utf-8'))
            else:
                self.send_response(403)
                self.end_headers()

        elif self.path == '/api/save_user':
            token = payload.get('token')
            if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
                user_data = payload.get('user')
                db_helper.save_user(user_data, DB_FILE)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            else:
                self.send_response(403)
                self.end_headers()

        elif self.path == '/api/delete_user':
            token = payload.get('token')
            if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
                user_id = payload.get('id')
                if user_id != db['sessions'][token]['user_id']: # prevent delete self
                    db_helper.delete_user(user_id, DB_FILE)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            else:
                self.send_response(403)
                self.end_headers()

        else:
            self.send_response(404)
            self.end_headers()

def run():
    import socket
    ports_to_try = [8080, 8000, 5000, 8888, 8081]
    for port in ports_to_try:
        try:
            server_address = ('127.0.0.1', port)
            httpd = HTTPServer(server_address, CustomAPIHandler)
            print("\n" + "="*60)
            print(f"✅ تم تشغيل الخادم بنجاح!")
            print(f"🌐 الرجاء نسخ أحد الروابط التالية ولصقه في المتصفح:")
            print(f"👉 http://127.0.0.1:{port}")
            print(f"👉 http://localhost:{port}")
            print("="*60 + "\n")
            httpd.serve_forever()
            return
        except OSError as e:
            print(f"⚠️ لم نتمكن من استخدام المنفذ {port}، جاري تجربة منفذ آخر... ({e})")
            continue
    print("❌ لم نتمكن من تشغيل الخادم. يرجى التحقق من جدار الحماية (Firewall) أو برامج الحماية المتعارضة.")

if __name__ == '__main__':
    run()
