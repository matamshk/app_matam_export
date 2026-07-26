import os
import sys
import pypdf

pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', '1447121.pdf')
out_txt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scratch', 'extracted_pdf_text.txt')

print(f"Reading PDF: {pdf_path}")
reader = pypdf.PdfReader(pdf_path)

with open(out_txt_path, 'w', encoding='utf-8') as f:
    f.write(f"Total Pages: {len(reader.pages)}\n\n")
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        f.write(f"--- PAGE {i+1} ---\n")
        f.write(text)
        f.write("\n\n")

print(f"Extraction complete. Text saved to: {out_txt_path}")
