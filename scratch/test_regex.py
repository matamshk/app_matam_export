import re
import os
import json

txt_path = r'c:\Users\DELL\Downloads\app_matam_export\scratch\extracted_pdf_text.txt'

with open(txt_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Regular expression to match the prayer time rows
# Example: 1 الإثنين 18  3:30 4:50 11:34 6:18 6:33 11:34
# Example 3: 3 الأربعاء  20  3:29 4:49 11:34 6:19 6:34 11:34
# Example 30: 30 الثلاثاء 16  3:21 4:45 11:38 6:31 6:46 11:38

# Let's search line by line or use re.finditer
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
for m in matches:
    print(m)
