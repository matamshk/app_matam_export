import json
import re
import sys
import datetime

sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

arabic_months = {
    'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6,
    'يوليو': 7, 'أغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
    'يونيه': 6, 'يوليه': 7, 'اكتوبر': 10
}

data = json.load(open(r'C:\Users\DELL\Downloads\تقويم-مأتم-أبو-صيبع-الشرقي-1448.json', encoding='utf-8'))

for m_idx, month in enumerate(data['months']):
    month_num_hijri = month['month_number']
    month_name_hijri = month['month_name_ar']
    
    range_parts = []
    for r in month['gregorian_range']:
        parts = r.strip().split()
        m_name = parts[0]
        year = int(parts[1])
        m_num = next((v for k, v in arabic_months.items() if k in m_name), None)
        range_parts.append((m_num, year))
        
    active_greg_month, active_greg_year = range_parts[0]
    lines = month['content_text'].split('\n')
    
    parsed_days = []
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean:
            continue
            
        times = re.findall(r'\d{1,2}:\s*\d{2}', line_clean)
        
        # Determine if this is a prayer row
        # In Ramadan we expect at least 4 times (since one might be missing), but typically 5.
        # In other months we expect at least 4 times.
        if len(times) < 4:
            continue
            
        # Extract prayer times
        # If Ramadan and we have >= 5 times:
        if month_num_hijri == 9 and len(times) >= 5:
            maghrib, dhuhr, sunrise, fajr = times[0], times[1], times[2], times[3]
            last_time = times[4]
        else:
            # For moon time rows, they might have 5 times. The actual prayer times are the last 4.
            maghrib, dhuhr, sunrise, fajr = times[-4], times[-3], times[-2], times[-1]
            last_time = times[-1]
            
        idx = line_clean.rfind(last_time)
        suffix = line_clean[idx + len(last_time):].strip()
        
        # Clean suffix from any failed OCR times (e.g. 14: 1)
        suffix_clean = re.sub(r'\d*:\s*\d*', '', suffix).strip()
        nums = re.findall(r'\d+', suffix_clean)
        
        if len(nums) >= 2:
            if len(nums) == 3:
                active_greg_month = int(nums[1])
                if active_greg_month == range_parts[1][0]:
                    active_greg_year = range_parts[1][1]
                greg_day = int(nums[0])
                hijri_day = int(nums[2])
            else:
                greg_day = int(nums[0])
                hijri_day = int(nums[1])
                
            parsed_days.append((hijri_day, greg_day, active_greg_month, active_greg_year))
            
    print(f"{month_num_hijri} {month_name_hijri}: parsed {len(parsed_days)} days. Expected around 29/30.")
    if len(parsed_days) < 29:
        print(f"  Warning: Only parsed {len(parsed_days)} days. Missing days!")
