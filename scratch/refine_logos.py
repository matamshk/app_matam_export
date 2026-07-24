from PIL import Image, ImageOps
import os

uploads_dir = "uploads"

def make_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # If it is close to white (intensity > 240 in RGB), make it transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
    img.putdata(newData)
    img.save(img_path)
    print(f"Made transparent: {img_path}")

# 1. Refine crop of the calligraphy logo from media__1784909457971.png
# Let's crop it slightly wider to make sure no text is cut off
# f_width = 768, f_height = 1024
footer_img = Image.open(r"C:\Users\DELL\.gemini\antigravity\brain\4d72a0bf-0409-4d7a-8fe7-8ac948ea9151\.user_uploaded\media__1784909457971.png")
f_width, f_height = footer_img.size

# Calligraphy logo crop
logo_crop = footer_img.crop((int(f_width * 0.35), int(f_height * 0.90), int(f_width * 0.63), int(f_height * 0.99)))
logo_crop.save(os.path.join(uploads_dir, "matam_logo_calligraphy.png"))
make_transparent(os.path.join(uploads_dir, "matam_logo_calligraphy.png"))

# Social media icons crop
social_crop = footer_img.crop((int(f_width * 0.20), int(f_height * 0.92), int(f_width * 0.38), int(f_height * 0.99)))
social_crop.save(os.path.join(uploads_dir, "matam_social_icons.png"))
make_transparent(os.path.join(uploads_dir, "matam_social_icons.png"))

# WhatsApp crop
whatsapp_crop = footer_img.crop((int(f_width * 0.60), int(f_height * 0.92), int(f_width * 0.78), int(f_height * 0.99)))
whatsapp_crop.save(os.path.join(uploads_dir, "matam_whatsapp_text.png"))
make_transparent(os.path.join(uploads_dir, "matam_whatsapp_text.png"))

# Make the circular logo transparent as well
# The red circle logo: let's make any white area outside the red circle transparent, 
# and also if there is white text inside the red circle, keep it!
# Wait, for the red circle, the background is white. Let's make it transparent.
def make_circle_transparent(img_path, target_color="white"):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    newData = []
    for item in datas:
        # Check if the pixel is white (background)
        # In a JPEG or rendered PDF, background is pure white: (255,255,255)
        if item[0] > 250 and item[1] > 250 and item[2] > 250:
            newData.append((255, 255, 255, 0)) # make transparent
        else:
            newData.append(item)
    img.putdata(newData)
    img.save(img_path)
    print(f"Made background transparent for circular logo: {img_path}")

make_circle_transparent(os.path.join(uploads_dir, "matam_logo_circle_red.png"))
make_circle_transparent(os.path.join(uploads_dir, "matam_logo_circle_black.png"))

print("Refinement completed successfully!")
