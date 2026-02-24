import os
import shutil
import random

# Paths
train_img = "dataset/images/train"
val_img   = "dataset/images/val"
train_lbl = "dataset/labels/train"
val_lbl   = "dataset/labels/val"

# Get all images
images = [f for f in os.listdir(train_img) 
          if f.endswith(('.jpg', '.jpeg', '.png'))]

# Shuffle randomly
random.shuffle(images)

# 80/20 split
split_point = int(len(images) * 0.8)
val_images  = images[split_point:]  # last 20%

print(f"Total images: {len(images)}")
print(f"Moving {len(val_images)} images to val...")

# Move val images and their labels
for img_file in val_images:
    # Move image
    shutil.move(
        os.path.join(train_img, img_file),
        os.path.join(val_img, img_file)
    )
    
    # Move corresponding label if exists
    label_file = os.path.splitext(img_file)[0] + ".txt"
    label_src  = os.path.join(train_lbl, label_file)
    
    if os.path.exists(label_src):
        shutil.move(label_src, os.path.join(val_lbl, label_file))

print(f"✅ Done!")
print(f"Train images: {len(os.listdir(train_img))}")
print(f"Val images:   {len(os.listdir(val_img))}")