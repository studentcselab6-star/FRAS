import sys
from typing import List, Dict, Optional
from deepface import DeepFace

def count_faces(image_path: str) -> int:
    return len(detect_faces(image_path))

def validate_face_count(image_path: str, expected_count: int = 1) -> bool:
    return count_faces(image_path) == expected_count

async def match_face(embedding: List[float], threshold: float = 1.0) -> Optional[str]:
    from pgvector.asyncpg import register_vector
    from pgvector import Vector
    import db
    
    async with db.pool.acquire() as conn:
        await register_vector(conn)
        
        matches = await conn.fetch(
            """
            SELECT regid, embedding <-> $1 as distance
            FROM face_embeddings
            ORDER BY embedding <-> $1
            LIMIT 1
            """,
            Vector(embedding)
        )
        
        if matches and matches[0]["distance"] <= threshold:
            return matches[0]["regid"]
        return None

def detect_faces(image_input) -> List[Dict]:
    try:
        face_objs = DeepFace.extract_faces(
            img_path=image_input,
            detector_backend="mtcnn",
            enforce_detection=False
        )

        return face_objs
    except Exception as e:
        print(f"Detection error: {e}")
        return []

def generate_face_embedding(face_matrix) -> Optional[List[float]]:
    try:
        embeddings = DeepFace.represent(
            img_path=face_matrix,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False
        )
        if not embeddings:
            return None
        return embeddings[0]["embedding"]
    except Exception as e:
        print(f"Embedding failed: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python image.py <image_path>")
    else:
        print(f"Faces detected: {count_faces(sys.argv[1])}")
