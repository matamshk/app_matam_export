import os
import json
import sys

# Reconfigure stdout/stderr to prevent charmap/UnicodeEncodeError on Windows
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

# Try to import firebase_admin
HAS_FIREBASE = False
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    HAS_FIREBASE = True
except ImportError:
    pass

db_client = None
current_dir = os.path.dirname(os.path.abspath(__file__))
cred_path = os.path.join(current_dir, 'service-account.json')

# Initialize Firebase Admin if credential file is present
if HAS_FIREBASE and os.path.exists(cred_path):
    try:
        # Check if already initialized to avoid duplicate apps error
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        db_client = firestore.client()
        print("🔥 Firebase Admin SDK initialized successfully in Python!")
    except Exception as e:
        print(f"⚠️ Failed to initialize Firebase: {e}")
        db_client = None
else:
    print("ℹ️ Running in Local Database Mode (service-account.json not found or firebase-admin not installed)")

# ----------------- DB READ UTILITY -----------------
def load_db(db_file='database.json'):
    if db_client:
        try:
            # 1. Fetch bookings
            bookings_ref = db_client.collection('bookings').get()
            bookings = []
            for doc in bookings_ref:
                data = doc.to_dict()
                if 'timestamp' in data: del data['timestamp']
                bookings.append({**data, 'id': doc.id})
            
            # Sort bookings descending by date string
            bookings.sort(key=lambda x: x.get('date', ''), reverse=True)

            # 2. Fetch custom occasions
            occasions_ref = db_client.collection('custom_occasions').get()
            occasions = []
            for doc in occasions_ref:
                data = doc.to_dict()
                occasions.append({**data, 'id': doc.id})

            # 3. Fetch contributions
            contributions_ref = db_client.collection('contributions').get()
            contributions = []
            for doc in contributions_ref:
                data = doc.to_dict()
                if 'timestamp' in data: del data['timestamp']
                contributions.append({**data, 'id': doc.id})
            
            # 4. Fetch metadata (settings and hijri offset)
            settings_doc = db_client.collection('metadata').document('settings').get()
            hijri_doc = db_client.collection('metadata').document('hijri').get()

            settings = settings_doc.to_dict() if settings_doc.exists else {"whatsapp_phone": "97300000000"}
            hijri_offset = hijri_doc.to_dict().get('offset', 0) if hijri_doc.exists else 0

            # 5. Fetch users list
            users_ref = db_client.collection('users').get()
            users = []
            for doc in users_ref:
                data = doc.to_dict()
                users.append({**data, 'id': doc.id})
            
            # If no users, initialize default admin
            if not users:
                default_user = {
                    "username": "admin",
                    "password": "admin123",
                    "role": "superadmin",
                    "name": "المدير العام",
                    "permissions": {}
                }
                db_client.collection('users').document('superadmin1').set(default_user)
                users.append({**default_user, 'id': 'superadmin1'})

            # 6. Fetch sessions
            sessions_ref = db_client.collection('sessions').get()
            sessions = {}
            for doc in sessions_ref:
                sessions[doc.id] = doc.to_dict()

            # Sync local file as a backup
            full_db = {
                "bookings": bookings,
                "custom_occasions": occasions,
                "contributions": contributions,
                "hijri_offset": hijri_offset,
                "settings": settings,
                "users": users,
                "sessions": sessions
            }
            try:
                with open(os.path.join(current_dir, db_file), 'w', encoding='utf-8') as f:
                    json.dump(full_db, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
                
            return full_db
        except Exception as e:
            print(f"⚠️ Error loading from Firestore: {e}. Falling back to local file.")
            
    # Local fallback
    local_path = os.path.join(current_dir, db_file)
    if not os.path.exists(local_path):
        default_db = {
            "bookings": [],
            "custom_occasions": [],
            "contributions": [],
            "hijri_offset": 0,
            "settings": {"whatsapp_phone": "97300000000"},
            "users": [{"id": "superadmin1", "username": "admin", "password": "admin123", "role": "superadmin", "name": "المدير العام"}],
            "sessions": {}
        }
        with open(local_path, 'w', encoding='utf-8') as f:
            json.dump(default_db, f, ensure_ascii=False, indent=2)
        return default_db
        
    with open(local_path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {"bookings": [], "custom_occasions": [], "contributions": [], "hijri_offset": 0, "settings": {}, "users": [], "sessions": {}}

# Helper to save local db backup when in offline mode
def save_local_db(data, db_file='database.json'):
    local_path = os.path.join(current_dir, db_file)
    with open(local_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ----------------- DB WRITE UTILITIES -----------------

def save_booking(booking, db_file='database.json'):
    if db_client:
        try:
            doc_id = str(booking.get('id', int(os.times()[4] * 1000)))
            db_client.collection('bookings').document(doc_id).set({
                'name': booking.get('name', ''),
                'phone': booking.get('phone', ''),
                'date': booking.get('date', ''),
                'occasion': booking.get('occasion', ''),
                'notes': booking.get('notes', ''),
                'status': booking.get('status', 'pending'),
                'timestamp': firestore.SERVER_TIMESTAMP
            }, merge=True)
            return True
        except Exception as e:
            print(f"⚠️ Firestore write failed: {e}")
            
    # Fallback
    db = load_db(db_file)
    db['bookings'].insert(0, booking)
    save_local_db(db, db_file)
    return False

def update_booking_status(booking_id, new_status, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('bookings').document(str(booking_id)).update({
                'status': new_status
            })
            return True
        except Exception as e:
            print(f"⚠️ Firestore update failed: {e}")

    # Fallback
    db = load_db(db_file)
    for b in db['bookings']:
        if str(b.get('id')) == str(booking_id):
            b['status'] = new_status
            break
    save_local_db(db, db_file)
    return False

def delete_booking(booking_id, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('bookings').document(str(booking_id)).delete()
            return True
        except Exception as e:
            print(f"⚠️ Firestore delete failed: {e}")

    # Fallback
    db = load_db(db_file)
    db['bookings'] = [b for b in db['bookings'] if str(b.get('id')) != str(booking_id)]
    save_local_db(db, db_file)
    return False

def edit_booking(booking_id, name, phone, date, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('bookings').document(str(booking_id)).update({
                'name': name,
                'phone': phone,
                'date': date
            })
            return True
        except Exception as e:
            print(f"⚠️ Firestore edit failed: {e}")

    # Fallback
    db = load_db(db_file)
    for b in db['bookings']:
        if str(b.get('id')) == str(booking_id):
            b['name'] = name
            b['phone'] = phone
            b['date'] = date
            break
    save_local_db(db, db_file)
    return False

def save_custom_occasion(occasion, db_file='database.json'):
    if db_client:
        try:
            doc_id = str(occasion.get('id', int(os.times()[4] * 1000)))
            db_client.collection('custom_occasions').document(doc_id).set({
                'title': occasion.get('title', ''),
                'hijri': occasion.get('hijri', {}),
                'type': occasion.get('type', 'custom'),
                'description': occasion.get('description', ''),
                'isCustom': occasion.get('isCustom', True)
            })
            return True
        except Exception as e:
            print(f"⚠️ Firestore occasion write failed: {e}")

    # Fallback
    db = load_db(db_file)
    db['custom_occasions'].append(occasion)
    save_local_db(db, db_file)
    return False

def save_contribution(contribution, db_file='database.json'):
    if db_client:
        try:
            doc_id = str(contribution.get('id', int(os.times()[4] * 1000)))
            db_client.collection('contributions').document(doc_id).set({
                'donor_name': contribution.get('donor_name', ''),
                'amount': contribution.get('amount', 0.0),
                'type': contribution.get('type', ''),
                'phone': contribution.get('phone', ''),
                'receipt_image': contribution.get('receipt_image'),
                'deceased_list': contribution.get('deceased_list', []),
                'status': contribution.get('status', 'pending'),
                'timestamp': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"⚠️ Firestore contribution write failed: {e}")

    # Fallback
    db = load_db(db_file)
    db['contributions'].insert(0, contribution)
    save_local_db(db, db_file)
    return False

def save_offset(offset, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('metadata').document('hijri').set({
                'offset': offset
            }, merge=True)
            return True
        except Exception as e:
            print(f"⚠️ Firestore offset update failed: {e}")

    # Fallback
    db = load_db(db_file)
    db['hijri_offset'] = offset
    save_local_db(db, db_file)
    return False

def save_settings(settings, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('metadata').document('settings').set(settings, merge=True)
            return True
        except Exception as e:
            print(f"⚠️ Firestore settings update failed: {e}")

    # Fallback
    db = load_db(db_file)
    if 'settings' not in db: db['settings'] = {}
    db['settings'].update(settings)
    save_local_db(db, db_file)
    return False

def save_prayer_reference(file_data, filename, update_option, db_file='database.json'):
    import base64
    safe_filename = "".join(c for c in filename if c.isalnum() or c in ('.', '_', '-'))
    if not safe_filename:
        safe_filename = "prayer_reference"
        
    uploads_dir = os.path.join(current_dir, 'uploads')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        
    local_path = os.path.join(uploads_dir, safe_filename)
    
    try:
        if ',' in file_data:
            base64_str = file_data.split(',', 1)[1]
        else:
            base64_str = file_data
            
        file_bytes = base64.b64decode(base64_str)
        with open(local_path, 'wb') as f:
            f.write(file_bytes)
    except Exception as e:
        print(f"⚠️ Failed to write reference file locally: {e}")
        
    file_url = f"/uploads/{safe_filename}"
    
    if db_client:
        try:
            db_client.collection('metadata').document('prayer_reference').set({
                'file_data': file_data,
                'filename': filename,
                'update_option': update_option,
                'file_url': file_url,
                'timestamp': firestore.SERVER_TIMESTAMP
            }, merge=True)
            
            db_client.collection('metadata').document('settings').set({
                'prayer_reference_url': file_url,
                'prayer_reference_option': update_option
            }, merge=True)
            
            return file_url
        except Exception as e:
            print(f"⚠️ Firestore prayer reference update failed: {e}")
            
    # Fallback
    db = load_db(db_file)
    if 'settings' not in db: db['settings'] = {}
    db['settings']['prayer_reference_url'] = file_url
    db['settings']['prayer_reference_option'] = update_option
    save_local_db(db, db_file)
    return file_url


def save_user(user_data, db_file='database.json'):
    import uuid
    user_id = user_data.get('id')
    if not user_id:
        user_id = 'user_' + uuid.uuid4().hex[:8]
        user_data['id'] = user_id

    if db_client:
        try:
            db_client.collection('users').document(str(user_id)).set({
                'username': user_data.get('username', ''),
                'password': user_data.get('password', ''),
                'name': user_data.get('name', ''),
                'role': user_data.get('role', 'user'),
                'permissions': user_data.get('permissions', {})
            }, merge=True)
            return user_id
        except Exception as e:
            print(f"⚠️ Firestore save_user failed: {e}")

    # Fallback
    db = load_db(db_file)
    existing_user = next((u for u in db['users'] if str(u.get('id')) == str(user_id)), None)
    if existing_user:
        existing_user.update(user_data)
    else:
        db['users'].append(user_data)
    save_local_db(db, db_file)
    return user_id

def delete_user(user_id, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('users').document(str(user_id)).delete()
            return True
        except Exception as e:
            print(f"⚠️ Firestore delete_user failed: {e}")

    # Fallback
    db = load_db(db_file)
    db['users'] = [u for u in db['users'] if str(u.get('id')) != str(user_id)]
    save_local_db(db, db_file)
    return False

def save_session(token, session_data, db_file='database.json'):
    if db_client:
        try:
            db_client.collection('sessions').document(str(token)).set(session_data, merge=True)
            return True
        except Exception as e:
            print(f"⚠️ Firestore save_session failed: {e}")

    # Fallback
    db = load_db(db_file)
    if 'sessions' not in db:
        db['sessions'] = {}
    db['sessions'][str(token)] = session_data
    save_local_db(db, db_file)
    return False
