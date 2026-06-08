import re
import os
import json

# Paths
txt_path = r'c:\Users\DELL\Downloads\app_matam_export\scratch\extracted_pdf_text.txt'
root_db_path = r'c:\Users\DELL\Downloads\app_matam_export\database.json'
flutter_db_path = r'c:\Users\DELL\Downloads\app_matam_export\matam_flutter\assets\www\database.json'

with open(txt_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Regular expression to match prayer time rows
# Example: 1 الإثنين 18  3:30 4:50 11:34 6:18 6:33 11:34
pattern = re.compile(
    r'(\d+)\s+([\u0600-\u06FF]+)\s+(\d+)\s*(?:\s*)?'
    r'(\d{1,2}:\d{2})\s+'
    r'(\d{1,2}:\d{2})\s+'
    r'(\d{1,2}:\d{2})\s+'
    r'(\d{1,2}:\d{2})\s+'
    r'(\d{1,2}:\d{2})\s+'
    r'(\d{1,2}:\d{2})'
)

matches = pattern.findall(text)
print(f"Found {len(matches)} matches")

prayer_calendar_database = {}

for m in matches:
    hijri_day = int(m[0])
    day_name = m[1]
    gregorian_day = int(m[2])
    
    fajr = m[3]
    sunrise = m[4]
    dhuhr = m[5]
    sunset = m[6]
    maghrib = m[7]
    midnight = m[8]
    
    # Map to Gregorian date
    # Hijri month 12 is Dhu al-Hijjah 1447.
    # Day 1-14: May 18-31, 2026
    # Day 15-30: June 1-16, 2026
    if hijri_day <= 14:
        greg_date = f"2026-05-{gregorian_day:02d}"
    else:
        greg_date = f"2026-06-{gregorian_day:02d}"
        
    prayer_calendar_database[greg_date] = {
        "hijri_day": hijri_day,
        "hijri_month": 12,
        "hijri_year": 1447,
        "day_name_ar": day_name,
        "fajr": fajr,
        "sunrise": sunrise,
        "dhuhr": dhuhr,
        "sunset": sunset,
        "maghrib": maghrib,
        "midnight": midnight
    }

# Print the constructed dict length and key examples
print("Number of mapped dates:", len(prayer_calendar_database))
if prayer_calendar_database:
    first_key = list(prayer_calendar_database.keys())[0]
    last_key = list(prayer_calendar_database.keys())[-1]
    print(f"First element: {first_key} -> (omitted Arabic print)")
    print(f"Last element: {last_key} -> (omitted Arabic print)")

# Function to update database.json
def update_db(db_path):
    if not os.path.exists(db_path):
        print(f"Database path does not exist: {db_path}")
        return
        
    with open(db_path, 'r', encoding='utf-8') as f:
        db = json.load(f)
        
    if 'settings' not in db:
        db['settings'] = {}
        
    db['settings']['prayer_calendar_database'] = prayer_calendar_database
    
    # Adopt 1447121.pdf as the active reference file
    db['settings']['prayer_reference_url'] = '/uploads/1447121.pdf'
    db['settings']['prayer_reference_option'] = 'apply_offsets'  # Or download_only, but applying offsets is active
    
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated database at: {db_path}")

update_db(root_db_path)
update_db(flutter_db_path)
