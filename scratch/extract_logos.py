import fitz  # PyMuPDF
from PIL import Image, ImageOps
import os

pdf_path = r"C:\Users\DELL\.gemini\antigravity\brain\4d72a0bf-0409-4d7a-8fe7-8ac948ea9151\.user_uploaded\media__1784909423051.pdf"
png_path = r"C:\Users\DELL\.gemini\antigravity\brain\4d72a0bf-0409-4d7a-8fe7-8ac948ea9151\.user_uploaded\media__1784909457971.png"
uploads_dir = "uploads"

if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)

# 1. Render PDF page 1 to PNG
doc = fitz.open(pdf_path)
page = doc.load_page(0)
pix = page.get_pixmap(dpi=300)
pdf_page_img_path = os.path.join(uploads_dir, "temp_pdf_page.png")
pix.save(pdf_page_img_path)
print(f"Rendered PDF page to {pdf_page_img_path}")

# Load the rendered PDF page image
pdf_img = Image.open(pdf_page_img_path)
width, height = pdf_img.size
print(f"PDF page image dimensions: {width}x{height}")

# Let's crop the circular logos:
# We know the layout of page 1 of the PDF has circular logos.
# Let's crop:
# - Black circle logo (middle-left)
# - Red circle logo (middle-right)
# In page 1 screenshot, the circular logos are in the middle of the page.
# Let's write a crop logic:
# Black circle is roughly at x: 10% to 45%, y: 40% to 65%
# Red circle is roughly at x: 55% to 90%, y: 40% to 65%
black_circle_crop = pdf_img.crop((int(width * 0.12), int(height * 0.44), int(width * 0.38), int(height * 0.62)))
black_circle_crop.save(os.path.join(uploads_dir, "matam_logo_circle_black.png"))

red_circle_crop = pdf_img.crop((int(width * 0.62), int(height * 0.44), int(width * 0.88), int(height * 0.62)))
red_circle_crop.save(os.path.join(uploads_dir, "matam_logo_circle_red.png"))

print("Cropped circular logos from PDF.")

# 2. Crop the calligraphy logo from media__1784909457971.png
# Let's inspect the png size first
footer_img = Image.open(png_path)
f_width, f_height = footer_img.size
print(f"Footer image dimensions: {f_width}x{f_height}")

# The logo typography "مأتم أبو صيبع" is at the bottom center.
# Let's crop:
# x: 35% to 65%, y: 91% to 100%
calligraphy_crop = footer_img.crop((int(f_width * 0.38), int(f_height * 0.91), int(f_width * 0.62), int(f_height * 1.0)))
calligraphy_crop.save(os.path.join(uploads_dir, "matam_logo_calligraphy.png"))

# Also crop the social media icons on the left:
# x: 20% to 38%, y: 92% to 100%
social_crop = footer_img.crop((int(f_width * 0.20), int(f_height * 0.92), int(f_width * 0.38), int(f_height * 0.99)))
social_crop.save(os.path.join(uploads_dir, "matam_social_icons.png"))

# Also crop the WhatsApp text on the right:
# x: 61% to 78%, y: 92% to 100%
whatsapp_crop = footer_img.crop((int(f_width * 0.61), int(f_height * 0.92), int(f_width * 0.78), int(f_height * 0.99)))
whatsapp_crop.save(os.path.join(uploads_dir, "matam_whatsapp_text.png"))

print("Cropped footer components.")

# Clean up temp file
if os.path.exists(pdf_page_img_path):
    os.remove(pdf_page_img_path)
