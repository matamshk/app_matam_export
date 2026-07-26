import os
import json
import base64
import time
import uuid
import copy
import sys
from flask import Flask, request, jsonify, send_from_directory
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')

# Configuration
DB_FILE = os.path.join(BASE_DIR, 'database.json')
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
    payload = request.json
    db_helper.save_booking(payload, DB_FILE)
    db = load_db()
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/save_custom_occasion', methods=['POST'])
def save_custom_occasion():
    payload = request.json
    db_helper.save_custom_occasion(payload, DB_FILE)
    db = load_db()
    trigger_auto_sync("sync_occasions", db)
    return jsonify({"status": "success"})

@app.route('/api/save_offset', methods=['POST'])
def save_offset():
    payload = request.json
    db_helper.save_offset(payload.get('offset', 0), DB_FILE)
    return jsonify({"status": "success"})

@app.route('/api/update_booking_status', methods=['POST'])
def update_booking_status():
    payload = request.json
    booking_id = payload.get('id')
    new_status = payload.get('status')
    db_helper.update_booking_status(booking_id, new_status, DB_FILE)
    db = load_db()
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/delete_booking', methods=['POST'])
def delete_booking():
    payload = request.json
    booking_id = payload.get('id')
    db_helper.delete_booking(booking_id, DB_FILE)
    db = load_db()
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/edit_booking', methods=['POST'])
def edit_booking():
    payload = request.json
    booking_id = payload.get('id')
    db_helper.edit_booking(booking_id, payload.get('name'), payload.get('phone'), payload.get('date'), DB_FILE)
    db = load_db()
    trigger_auto_sync("sync_bookings", db)
    return jsonify({"status": "success"})

@app.route('/api/save_settings', methods=['POST'])
def save_settings():
    payload = request.json
    db_helper.save_settings(payload.get('settings', {}), DB_FILE)
    db = load_db()
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
        db_helper.save_session(token, {"user_id": user['id'], "role": user['role'], "name": user['name']}, DB_FILE)
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
        db_helper.save_user(user_data, DB_FILE)
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
            db_helper.delete_user(user_id, DB_FILE)
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 403

@app.route('/api/save_contribution', methods=['POST'])
def save_contribution():
    payload = request.json
    
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
    db_helper.save_contribution(payload, DB_FILE)
    db = load_db()
    
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

@app.route('/api/upload_prayer_reference', methods=['POST'])
def upload_prayer_reference():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    
    is_authorized = True
    if token and 'sessions' in db:
        session = db['sessions'].get(token)
        if not session:
            is_authorized = False
            
    if not is_authorized:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
        
    file_data = payload.get('file_data')
    filename = payload.get('filename')
    update_option = payload.get('update_option', 'download_only')
    
    if not file_data or not filename:
        return jsonify({"status": "error", "message": "Missing file_data or filename"}), 400
        
    file_url = db_helper.save_prayer_reference(file_data, filename, update_option, DB_FILE)
    return jsonify({"status": "success", "file_url": file_url})


@app.route('/api/add_calendar_occasion', methods=['POST'])
def add_calendar_occasion():
    import time
    db = load_db()
    payload = request.json
    token = payload.get('token')
    
    is_authorized = True
    if token and 'sessions' in db:
        session = db['sessions'].get(token)
        if not session:
            is_authorized = False
            
    if not is_authorized:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
        
    month_num = int(payload.get('monthNumber'))
    title = payload.get('title')
    hijri_day = int(payload.get('hijriDay'))
    event_type = payload.get('eventType', 'GENERAL')
    
    json_path = os.path.join(os.path.dirname(__file__), "uploads", "structured-calendar-1448.json")
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "Calendar JSON file not found"}), 404
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    target_month = next((m for m in data.get('months', []) if m.get('monthNumber') == month_num), None)
    if not target_month:
        return jsonify({"status": "error", "message": "Month not found"}), 404
        
    new_occ = {
        "id": "occ_" + str(int(time.time() * 1000)),
        "title": title,
        "hijriDay": hijri_day,
        "eventType": event_type
    }
    
    if "occasions" not in target_month:
        target_month["occasions"] = []
    target_month["occasions"].append(new_occ)
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    return jsonify({"status": "success"})

@app.route('/api/edit_calendar_occasion', methods=['POST'])
def edit_calendar_occasion():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    
    is_authorized = True
    if token and 'sessions' in db:
        session = db['sessions'].get(token)
        if not session:
            is_authorized = False
            
    if not is_authorized:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
        
    month_num = int(payload.get('monthNumber'))
    occ_id = payload.get('occasionId')
    title = payload.get('title')
    hijri_day = int(payload.get('hijriDay'))
    event_type = payload.get('eventType')
    
    json_path = os.path.join(os.path.dirname(__file__), "uploads", "structured-calendar-1448.json")
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "Calendar JSON file not found"}), 404
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    target_month = next((m for m in data.get('months', []) if m.get('monthNumber') == month_num), None)
    if not target_month:
        return jsonify({"status": "error", "message": "Month not found"}), 404
        
    occ = next((o for o in target_month.get('occasions', []) if o.get('id') == occ_id), None)
    if not occ:
        return jsonify({"status": "error", "message": "Occasion not found"}), 404
        
    occ["title"] = title
    occ["hijriDay"] = hijri_day
    if event_type:
        occ["eventType"] = event_type
        
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    return jsonify({"status": "success"})

@app.route('/api/delete_calendar_occasion', methods=['POST'])
def delete_calendar_occasion():
    db = load_db()
    payload = request.json
    token = payload.get('token')
    
    is_authorized = True
    if token and 'sessions' in db:
        session = db['sessions'].get(token)
        if not session:
            is_authorized = False
            
    if not is_authorized:
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
        
    month_num = int(payload.get('monthNumber'))
    occ_id = payload.get('occasionId')
    
    json_path = os.path.join(os.path.dirname(__file__), "uploads", "structured-calendar-1448.json")
    if not os.path.exists(json_path):
        return jsonify({"status": "error", "message": "Calendar JSON file not found"}), 404
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    target_month = next((m for m in data.get('months', []) if m.get('monthNumber') == month_num), None)
    if not target_month:
        return jsonify({"status": "error", "message": "Month not found"}), 404
        
    target_month["occasions"] = [o for o in target_month.get('occasions', []) if o.get('id') != occ_id]
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)

