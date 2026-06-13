import sys
from mtcnn import MTCNN
from PIL import Image
import numpy as np

def count_faces(image_path):
    detector = MTCNN()

    image = Image.open(image_path).convert('RGB')
    img_np = np.array(image)

    faces = detector.detect_faces(img_np)

    print(f"Faces detected: {len(faces)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python face_count.py <image_path>")
    else:
        count_faces(sys.argv[1])
