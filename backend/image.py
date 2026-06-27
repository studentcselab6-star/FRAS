import sys
import os
import numpy as np
from mtcnn import MTCNN
from PIL import Image
from typing import List, Dict, Optional, Tuple, Union
import uuid
from deepface import DeepFace
import tempfile

# Initialize MTCNN detector
DETECTOR = MTCNN()

def detect_faces(image_path: str) -> List[Dict]:
    """
    Detect faces in an image using MTCNN.
    Returns a list of face detections with bounding boxes and confidence scores.
    """
    image = Image.open(image_path).convert('RGB')
    img_np = np.array(image)
    faces = DETECTOR.detect_faces(img_np)
    return faces

def count_faces(image_path: str) -> int:
    """Count the number of faces detected in an image."""
    faces = detect_faces(image_path)
    return len(faces)

def extract_face(image_path: str, face: Dict) -> Optional[Image.Image]:
    """
    Extract a single face from an image using its bounding box.
    Returns a cropped PIL Image of the face.
    """
    image = Image.open(image_path).convert('RGB')
    img_np = np.array(image)
    
    x, y, width, height = face['box']
    x2, y2 = x + width, y + height
    
    # Add padding to the face region
    padding = max(width, height) // 4
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(img_np.shape[1], x2 + padding)
    y2 = min(img_np.shape[0], y2 + padding)
    
    face_img = img_np[y1:y2, x1:x2]
    return Image.fromarray(face_img)

def generate_temp_path(extension: str = '.jpg') -> str:
    """Generate a temporary file path."""
    temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
    os.makedirs(temp_dir, exist_ok=True)
    return os.path.join(temp_dir, f"{uuid.uuid4()}{extension}")

def validate_face_count(image_path: str, expected_count: int = 1) -> bool:
    """
    Validate that exactly `expected_count` faces are detected in the image.
    Returns True if the count matches, False otherwise.
    """
    return count_faces(image_path) == expected_count

def generate_face_embedding(image_path: str) -> Optional[List[float]]:
    """
    Generate a face embedding for the first detected face in the image.
    Uses DeepFace with Facenet model to generate a 128D embedding.
    Returns None if no face is detected.
    """
    try:
        faces = detect_faces(image_path)
        if not faces:
            return None
            
        # Extract the first face
        face_img = extract_face(image_path, faces[0])
        if not face_img:
            return None
            
        # Save the face to a temporary file
        temp_path = generate_temp_path()
        face_img.save(temp_path)
        
        # Generate embedding using DeepFace
        embedding = DeepFace.represent(
            img_path=temp_path,
            model_name="Facenet",
            enforce_detection=True
        )
        
        # Clean up
        os.remove(temp_path)
        
        return embedding[0]["embedding"] if embedding else None
        
    except Exception as e:
        print(f"Error generating face embedding: {e}")
        return None

async def match_face(embedding: List[float], threshold: float = 0.6) -> Optional[str]:
    """
    Match a face embedding against stored embeddings in the database.
    Returns the regid of the closest match if confidence > threshold, else None.
    """
    import db
    
    # Find the closest match
    matches = await db.query(
        """
        SELECT regid, 1 - (embedding <=> $1) as confidence
        FROM face_embeddings
        ORDER BY embedding <=> $1
        LIMIT 1
        """,
        [embedding]
    )
    
    if matches and matches[0]["confidence"] >= threshold:
        return matches[0]["regid"]
    return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python image.py <image_path>")
    else:
        print(f"Faces detected: {count_faces(sys.argv[1])}")
