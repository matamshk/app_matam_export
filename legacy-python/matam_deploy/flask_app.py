import os
import json
import base64
import time
import uuid
import copy
import sys
from flask import Flask, request, jsonify, send_from_directory

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

# Configuration
DB_FILE = os.path.join(BASE_DIR, 'database.json')
ADMIN_PASSWORD = 'admin123'
ADMIN_TOKEN = 'secure_admin_token_2026_xyz'

# Ensure DB exists
def init_db():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "bookings": [],
                "custom_occasions": [],
                "contributions": [],
                "hijri_offset": 0,
                "settings": {"whatsapp_phone": "97300000000"},
                "users": [{"id": "superadmin1", "username": "admin", "password": "admin123", "role": "superadmin", "name": "المدير العام"}],
                "sessions": {}
            }, f, ensure_ascii=False, indent=2)

def load_db():
    init_db()
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            db = json.load(f)
            if "users" not in db:
                db["users"] = [{"id": "superadmin1", "username": "admin", "password": "admin123", "role": "superadmin", "name": "المدير العام"}]
            if "sessions" not in db:
                db["sessions"] = {}
            if "contributions" not in db:
                db["contributions"] = []
            return db
    except Exception:
        return {"bookings": [], "custom_occasions": [], "contributions": [], "hijri_offset": 0, "settings": {"whatsapp_phone": "97300000000"}, "users": [{"id": "superadmin1", "username": "admin", "password": "admin123", "role": "superadmin", "name": "المدير العام"}], "sessions": {}}

def save_db(data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

init_db()

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

@app.route('/')
def serve_index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    full_path = os.path.join(BASE_DIR, path)
    if os.path.exists(full_path):
        return send_from_directory(BASE_DIR, path)
    return "File not found", 404

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'js'), filename)

# API Endpoints
@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_db())

@app.route('/api/save_booking', methods=['POST'])
def save_booking():
    db = load_db()
    payload = request.json
    db['bookings'].insert(0, payload)
    save_db(db)
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/save_custom_occasion', methods=['POST'])
def save_custom_occasion():
    db = load_db()
    payload = request.json
    db['custom_occasions'].append(payload)
    save_db(db)
    trigger_auto_sync("sync_occasions", db)
    return jsonify({"status": "success"})

@app.route('/api/save_offset', methods=['POST'])
def save_offset():
    db = load_db()
    payload = request.json
    db['hijri_offset'] = payload.get('offset', 0)
    save_db(db)
    return jsonify({"status": "success"})

@app.route('/api/update_booking_status', methods=['POST'])
def update_booking_status():
    db = load_db()
    payload = request.json
    booking_id = payload.get('id')
    new_status = payload.get('status')
    for b in db['bookings']:
        if str(b.get('id')) == str(booking_id):
            b['status'] = new_status
            break
    save_db(db)
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/delete_booking', methods=['POST'])
def delete_booking():
    db = load_db()
    payload = request.json
    booking_id = payload.get('id')
    db['bookings'] = [b for b in db['bookings'] if str(b.get('id')) != str(booking_id)]
    save_db(db)
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/edit_booking', methods=['POST'])
def edit_booking():
    db = load_db()
    payload = request.json
    booking_id = payload.get('id')
    for b in db['bookings']:
        if str(b.get('id')) == str(booking_id):
            if 'name' in payload: b['name'] = payload['name']
            if 'phone' in payload: b['phone'] = payload['phone']
            if 'date' in payload: b['date'] = payload['date']
            break
    save_db(db)
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    db = load_db()
    payload = request.json
    if 'settings' not in db:
        db['settings'] = {}
    db['settings'].update(payload.get('settings', {}))
    save_db(db)
    trigger_auto_sync("sync_users", db)
    return jsonify({"status": "success"})

@app.route('/api/login', methods=['POST'])
def login():
    db = load_db()
    payload = request.json
    username = payload.get('username')
    password = payload.get('password')
    user = next((u for u in db['users'] if u.get('username') == username and u.get('password') == password), None)
    
    if user:
        token = uuid.uuid4().hex
        db['sessions'][token] = {"user_id": user['id'], "role": user['role'], "name": user['name']}
        save_db(db)
        return jsonify({"status": "success", "token": token, "role": user['role'], "name": user['name']})
    else:
        return jsonify({"status": "error", "message": "Invalid password"}), 401

@app.route('/api/verify', methods=['POST'])
def verify():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    if token in db['sessions']:
        user_info = db['sessions'][token]
        user = next((u for u in db['users'] if u.get('id') == user_info['user_id']), None)
        perms = user.get('permissions', {}) if user else {}
        return jsonify({"status": "success", "role": user_info['role'], "name": user_info.get('name'), "permissions": perms})
    else:
        return jsonify({"status": "error"}), 401

@app.route('/api/get_users', methods=['POST'])
def get_users():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
        safe_users = [{"id": u.get("id"), "username": u.get("username"), "name": u.get("name", ""), "role": u.get("role"), "permissions": u.get("permissions", {})} for u in db['users']]
        return jsonify({"status": "success", "users": safe_users})
    return jsonify({"status": "error"}), 403

@app.route('/api/save_user', methods=['POST'])
def save_user():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
        user_data = payload.get('user')
        user_id = user_data.get('id', '')
        if not user_id:
            user_data['id'] = 'user_' + uuid.uuid4().hex[:8]
            db['users'].append(user_data)
        else:
            for u in db['users']:
                if u.get('id') == user_id:
                    u['username'] = user_data.get('username')
                    if user_data.get('password'):
                        u['password'] = user_data.get('password')
                    u['name'] = user_data.get('name')
                    u['role'] = user_data.get('role')
                    u['permissions'] = user_data.get('permissions', {})
                    break
        save_db(db)
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 403

@app.route('/api/delete_user', methods=['POST'])
def delete_user():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
        user_id = payload.get('id')
        if user_id != db['sessions'][token]['user_id']:
            db['users'] = [u for u in db['users'] if u.get('id') != user_id]
            save_db(db)
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 403

@app.route('/api/save_contribution', methods=['POST'])
def save_contribution():
    db = load_db()
    payload = request.json
    
    if 'contributions' not in db:
        db['contributions'] = []
        
    google_payload = copy.deepcopy(payload)
    
    upload_dir = os.path.join(BASE_DIR, 'uploads')
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

    if payload.get('receipt_image'):
        payload['receipt_image'] = save_b64_image(payload['receipt_image'], 'receipt')
        
    if 'deceased_list' in payload:
        for idx, dec in enumerate(payload['deceased_list']):
            if dec.get('photo'):
                dec['photo'] = save_b64_image(dec['photo'], f'deceased_{idx}')
    
    payload['status'] = 'pending'
    db['contributions'].insert(0, payload)
    save_db(db)
    
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
            
    return jsonify({"status": "success"})

@app.route('/api/export_full_database', methods=['POST'])
def export_full_database():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    if token in db['sessions'] and db['sessions'][token]['role'] == 'superadmin':
        settings = db.get('settings', {})
        google_url = settings.get('google_webapp_url', '')
        if not google_url:
            return jsonify({"status": "error", "message": "رابط المزامنة السحابي (Google Web App URL) غير مدخل."}), 400
        
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
            
            return jsonify({"status": "success"})
        except Exception as err:
            return jsonify({"status": "error", "message": f"فشل تصدير البيانات إلى جوجل: {err}"}), 500
    else:
        return jsonify({"status": "error"}), 403

if __name__ == '__main__':
    app.run(port=8080, debug=True)
