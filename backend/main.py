from fastapi import FastAPI, Request, File, Form, UploadFile, HTTPException, Header
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from supabase import create_client
from dotenv import load_dotenv
from datetime import date, datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import uvicorn
import os
import db
import traceback
import validators
from fastapi.middleware.cors import CORSMiddleware
from asyncpg.exceptions import UniqueViolationError
from pgvector.asyncpg import register_vector

load_dotenv()

# Configuration
PORT = int(os.getenv("PORT", 3000))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 1
BUCKET = "student_images"

# Initialize Supabase
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database pool
    await db.init_pool()
    
    # Ensure the pool is initialized
    if db.pool is None:
        raise RuntimeError("Failed to initialize database pool")
    
    # Register pgvector on a single connection from the pool
    async with db.pool.acquire() as conn:
        await register_vector(conn)
    
    yield
    await db.close_pool()

app = FastAPI(lifespan=lifespan)
origins = [
    "https://fras-virid.vercel.app",
    "https://vinaykatikireddy.is-a.dev",
    "https://fras.vinaykatikireddy.is-a.dev",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Middleware for logging
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     print(f"Incoming: {request.method} {request.url.path}")
#     return await call_next(request)


# ============ HELPER FUNCTIONS ============
async def get_current_user(authorization: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token format")

async def enrich_with_images(students):
    if not supabase:
        return students
    
    for student in students:
        try:
            filename = f"{student['batch']}/{student['programme']}-{student['class_section']}/{student['regid']}.jpg"
            signed = supabase.storage.from_(BUCKET).create_signed_url(filename, 360)
            student["image"] = signed["signedURL"]
        except Exception as e:
            student["image"] = None
    return students

async def process_student_image(image: UploadFile, regid: str, batch: str, programme: str, class_section: str) -> bool:
    """
    Process a student image: detect face, generate embedding, and store in database.
    Returns True if successful, False otherwise.
    """
    import image
    from pgvector.asyncpg import register_vector
    
    try:
        # Save the uploaded image temporarily
        temp_path = image.filename
        with open(temp_path, "wb") as f:
            f.write(await image.read())
        
        # Validate exactly one face is detected
        if not image.validate_face_count(temp_path, 1):
            os.remove(temp_path)
            return False
        
        # Generate face embedding
        embedding = image.generate_face_embedding(temp_path)
        if not embedding:
            os.remove(temp_path)
            return False
        
        # Update face_embeddings table
        await db.query(
            """
            INSERT INTO face_embeddings (regid, embedding)
            VALUES ($1, $2)
            ON CONFLICT (regid) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = CURRENT_TIMESTAMP
            """,
            [regid, embedding]
        )
        
        # Update students table
        await db.query(
            """
            UPDATE students SET face_detected = TRUE, embedding_generated = TRUE
            WHERE regid = $1
            """,
            [regid]
        )
        
        # Upload to Supabase
        if supabase:
            filename = f"{batch}/{programme}-{class_section}/{regid}.jpg"
            with open(temp_path, "rb") as f:
                supabase.storage.from_(BUCKET).upload(filename, f.read())
        
        # Clean up
        os.remove(temp_path)
        return True
        
    except Exception as e:
        print(f"Error processing student image: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False

# ============ ROUTES ============
@app.get("/")
def home():
    return {"message": "API is running..."}

# ============ AUTH ENDPOINTS ============

@app.post("/auth/login")
async def login(username: str = Form(...), password: str = Form(...)):
    try:
        if not username or not password:
            raise HTTPException(status_code=401, detail="Username and password are required")

        user = await db.query(
            "SELECT * FROM logins WHERE username = $1",
            [username]
        )

        if not user or len(user) == 0:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not pwd_context.verify(password, user[0]["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
        to_encode = {"sub": username, "exp": expire}
        token = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": username
        }
    except HTTPException:
        raise
    except Exception as err:
        print(f"Login error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Login failed"})

@app.post("/auth/register")
async def register(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    """User registration"""
    try:
        username = validators.validate_username(username)
        email = validators.validate_email(email)
        password = validators.validate_password(password)

        existing = await db.query(
            "SELECT * FROM logins WHERE username = $1 OR email = $2",
            [username, email]
        )
        if existing and len(existing) > 0:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        hashed_password = pwd_context.hash(password)
        await db.query(
            "INSERT INTO logins (username, email, password) VALUES ($1, $2, $3)",
            [username, email, hashed_password]
        )
        return {"message": "User registered successfully", "username": username}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Register error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Registration failed"})

@app.post("/change-password")
async def change_password(current_password: str = Form(...), new_password: str = Form(...), authorization: str = Header(...)):
    try:
        current_user = await get_current_user(authorization)

        if not current_password:
            raise ValueError("Current password is required")
        new_password = validators.validate_password(new_password)

        user = await db.query("SELECT * FROM logins WHERE username = $1", [current_user])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not pwd_context.verify(current_password, user[0]["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        hashed_password = pwd_context.hash(new_password)
        await db.query(
            "UPDATE logins SET password = $1 WHERE username = $2",
            [hashed_password, current_user]
        )

        return {"message": "Password changed successfully"}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Change password error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Password change failed"})

# ============ STUDENT ENDPOINTS ============

@app.post("/students")
async def add_student(
    name: str = Form(...),
    regid: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(...),
    dob: str = Form(...),
    class_section: str = Form(...),
    fatherMobile: str = Form(...),
    gender: str = Form(...),
    lab_section: str = Form(...),
    programme: str = Form(...),
    regulation: str = Form(...),
    batch: str = Form(...),
    residence: str = Form(...),
    semester: str = Form(...),
    image: UploadFile = File(None),
    authorization: str = Header(...),
):
    try:
        await get_current_user(authorization)

        # Validations
        name = validators.validate_name(name)
        regid = validators.validate_regid(regid)
        email = validators.validate_email(email)
        mobile = validators.validate_phone(mobile)
        father_mobile = validators.validate_phone(fatherMobile)
        dob_parsed = validators.validate_dob(dob)
        gender = validators.validate_gender(gender)
        class_section = validators.validate(class_section, "Class section", validators.VALID_SECTIONS)
        lab_section = validators.validate(lab_section, "Lab section", validators.VALID_LAB_SECTIONS)
        programme = validators.validate(programme, "Programme", validators.VALID_PROGRAMMES)
        regulation = validators.validate(regulation, "Regulation", validators.VALID_REGULATIONS)
        batch = validators.validate(batch, "Batch", validators.VALID_BATCHES)
        residence = validators.validate(residence, "Residence", validators.VALID_RESIDENCES)
        semester = validators.validate(semester, "Semester", validators.VALID_SEMESTERS)
        validators.validate_image(image)

        await db.query(
            """
            INSERT INTO students (
                name, regid, email, mobile, dob, class_section,
                father_mobile, gender, lab_section, programme,
                regulation, batch, residence, semester
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
            [name, regid, email, mobile, dob_parsed, class_section, father_mobile,
             gender, lab_section, programme, regulation, batch, residence, semester]
        )

        if image:
            success = await process_student_image(image, regid, batch, programme, class_section)
            if not success:
                raise HTTPException(status_code=400, detail="Face detection failed. Please upload a clear image with exactly one face.")

    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Add student error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to add student"})

@app.get("/students/filter")
async def filter_students(programme: str = "", batch: str = "", section: str = "", semester: str = "", authorization: str = Header(...)):
    try:
        print("HIHIHI")
        await get_current_user(authorization)
        conditions = []
        params = []
        idx = 1

        if programme:
            conditions.append(f"programme = ${idx}")
            params.append(programme)
            idx += 1
        if batch:
            conditions.append(f"batch = ${idx}")
            params.append(batch)
            idx += 1
        if section:
            conditions.append(f"class_section = ${idx}")
            params.append(section)
            idx += 1
        if semester:
            conditions.append(f"semester = ${idx}")
            params.append(semester)
            idx += 1

        where_clause = " AND ".join(conditions) if conditions else "FALSE"

        students = await db.query(
            f"SELECT * FROM students WHERE {where_clause} ORDER BY regid",
            params
        )
        return await enrich_with_images(students)
    except HTTPException:
        raise
    except Exception as err:
        print(f"Filter students error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to filter students"})

@app.get("/students/{search}")
async def search_students(search: str, authorization: str = Header(...)):
    try:
        await get_current_user(authorization)

        search = search.replace("%", "").replace("_", "").strip()
        students = await db.query(
            "SELECT * FROM students WHERE name ILIKE $1 OR email ILIKE $1 OR regid ILIKE $1",
            [f"%{search}%"]
        )
        return await enrich_with_images(students)
    except HTTPException:
        raise
    except Exception as err:
        print(f"Search error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Search failed"})

@app.post("/update-students")
async def update_student(
    name: str = Form(...),
    regid: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(...),
    dob: str = Form(...),
    class_section: str = Form(...),
    fatherMobile: str = Form(...),
    gender: str = Form(...),
    lab_section: str = Form(...),
    programme: str = Form(...),
    regulation: str = Form(...),
    batch: str = Form(...),
    residence: str = Form(...),
    semester: str = Form(...),
    oldregid: str = Form(...),
    image: UploadFile = File(None),
    authorization: str = Header(...),
):
    try:
        await get_current_user(authorization)

        # Validations
        name = validators.validate_name(name)
        regid = validators.validate_regid(regid)
        email = validators.validate_email(email)
        mobile = validators.validate_phone(mobile)
        father_mobile = validators.validate_phone(fatherMobile)
        dob_parsed = validators.validate_dob(dob)
        gender = validators.validate_gender(gender)
        class_section = validators.validate(class_section, "Class section", validators.VALID_SECTIONS)
        lab_section = validators.validate(lab_section, "Lab section", validators.VALID_LAB_SECTIONS)
        programme = validators.validate(programme, "Programme", validators.VALID_PROGRAMMES)
        regulation = validators.validate(regulation, "Regulation", validators.VALID_REGULATIONS)
        batch = validators.validate(batch, "Batch", validators.VALID_BATCHES)
        residence = validators.validate(residence, "Residence", validators.VALID_RESIDENCES)
        semester = validators.validate(semester, "Semester", validators.VALID_SEMESTERS)
        oldregid_upper = oldregid.strip().upper()
        if not oldregid_upper:
            raise ValueError("Old Reg ID is required")
        validators.validate_image(image)

        # Verify student exists
        existing = await db.query(
            "SELECT regid FROM students WHERE regid = $1",
            [oldregid_upper]
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Student not found")

        # Check regid collision if regid changed
        if oldregid_upper != regid:
            collision = await db.query(
                "SELECT regid FROM students WHERE regid = $1",
                [regid]
            )
            if collision:
                raise HTTPException(status_code=400, detail="A student with this Reg ID already exists")

        await db.query(
            """
            UPDATE students
            SET
                name = $1,
                regid = $2,
                email = $3,
                mobile = $4,
                dob = $5,
                class_section = $6,
                father_mobile = $7,
                gender = $8,
                lab_section = $9,
                programme = $10,
                regulation = $11,
                batch = $12,
                residence = $13,
                semester = $14
            WHERE regid = $15
            """,
            [name, regid, email, mobile, dob_parsed, class_section, father_mobile,
             gender, lab_section, programme, regulation, batch, residence,
             semester, oldregid_upper]
        )

        if supabase:
            new_filename = f"{batch}/{programme}-{class_section}/{regid}.jpg"
            old_filename = f"{batch}/{programme}-{class_section}/{oldregid_upper}.jpg"
            is_regid_changed = oldregid_upper != regid

            if image:
                contents = await image.read()
                # Remove destination if it exists (overwrite)
                try:
                    supabase.storage.from_(BUCKET).remove([new_filename])
                except Exception:
                    pass
                supabase.storage.from_(BUCKET).upload(new_filename, contents)
                
                # Process face embedding
                temp_path = f"temp_{image.filename}"
                with open(temp_path, "wb") as f:
                    f.write(contents)
                
                success = await process_student_image(image, regid, batch, programme, class_section)
                os.remove(temp_path)
                
                if not success:
                    raise HTTPException(status_code=400, detail="Face detection failed. Please upload a clear image with exactly one face.")
                
                # Clean up old file if regid changed
                if is_regid_changed:
                    try:
                        supabase.storage.from_(BUCKET).remove([old_filename])
                        # Delete old embedding
                        await db.query("DELETE FROM face_embeddings WHERE regid = $1", [oldregid_upper])
                    except Exception:
                        pass
            elif is_regid_changed:
                # No new image but regid changed — move old file to new path
                try:
                    old_data = supabase.storage.from_(BUCKET).download(old_filename)
                    try:
                        supabase.storage.from_(BUCKET).remove([new_filename])
                    except Exception:
                        pass
                    supabase.storage.from_(BUCKET).upload(new_filename, old_data)
                    supabase.storage.from_(BUCKET).remove([old_filename])
                    
                    # Update embedding regid
                    await db.query(
                        "UPDATE face_embeddings SET regid = $1 WHERE regid = $2",
                        [regid, oldregid_upper]
                    )
                except Exception:
                    pass  # old image didn't exist, nothing to move

        return {"message": "Student updated successfully"}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Update student error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to update student"})

@app.delete("/students/{regid}")
async def delete_student(regid: str, authorization: str = Header(...)):
    try:
        await get_current_user(authorization)

        student = await db.query(
            """
            SELECT batch, programme, class_section, regid
            FROM students
            WHERE regid = $1
            """,
            [regid]
        )

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        student = student[0]

        if supabase:
            filename = (f"{student['batch']}/{student['programme']}-{student['class_section']}/{student['regid']}.jpg")

            try:
                supabase.storage.from_(BUCKET).remove([filename])
            except Exception as e:
                print(f"Storage delete failed: {e}")

        # Delete face embedding
        await db.query(
            "DELETE FROM face_embeddings WHERE regid = $1",
            [regid]
        )
        
        # Delete student
        await db.query(
            "DELETE FROM students WHERE regid = $1",
            [regid]
        )

        return {"message": "Student deleted successfully"}

    except HTTPException:
        raise
    except Exception as err:
        print(f"Delete student error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to delete student"})

# ============ ATTENDANCE ENDPOINTS ============
@app.post("/attendance")
async def submit_attendance(data: dict, authorization: str = Header(...)):
    try:
        current_user = await get_current_user(authorization)

        class_name = data.get("class", "").strip()
        period = data.get("period")
        students = data.get("students", [])

        if not class_name or not isinstance(students, list) or not students or period is None:
            raise HTTPException(status_code=400, detail="Missing required fields: class, period, and students")

        validators.validate_attendance_class(class_name)

        VALID_STATUSES = {1, 0}
        for student in students:
            regid = (student.get("regid") or "").strip()
            status = student.get("status", 1)
            if not regid:
                raise ValueError("Each student must have a valid regid")
            if status not in VALID_STATUSES:
                raise ValueError(f"Invalid attendance status: {status}")

            await db.query(
                """
                INSERT INTO attendance (regid, period, status, class, marked_by)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (regid, date, period) DO UPDATE SET status = EXCLUDED.status
                """,
                [
                    regid,
                    period,
                    status,
                    class_name,
                    current_user
                ],
            )

        return {"message": "Attendance submitted successfully", "count": len(students)}

    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except UniqueViolationError:
        raise HTTPException(status_code=409, detail=f"Attendance already recorded")
    except HTTPException:
        raise
    except Exception as err:
        print(f"Submit attendance error: {err}")
        return JSONResponse(status_code=500, content={"error": "Failed to submit attendance"})

@app.post("/attendance/recognize")
async def recognize_attendance(
    images: list[UploadFile] = File(...),
    class_info: str = Form(...),
    authorization: str = Header(...)
):
    """
    Recognize students from uploaded images and return their regids.
    Accepts 1-10 images and returns a list of recognized students.
    """
    from pgvector.asyncpg import register_vector
    import image
    print("before try")
    try:
        await get_current_user(authorization)
        if not images or len(images) > 10:
            raise HTTPException(status_code=400, detail="Please upload 1-10 images")
            
        recognized_students = []
        print("before for loop")
        for img in images:
            # Save the uploaded image temporarily
            temp_path = f"temp_{img.filename}"
            with open(temp_path, "wb") as f:
                f.write(await img.read())
            
            # Detect faces in the image
            faces = image.detect_faces(temp_path)
            if not faces:
                os.remove(temp_path)
                continue
                
            # Process each face
            for face in faces:
                print("for in faces")
                # Extract face
                face_img = image.extract_face(temp_path, face)
                if not face_img:
                    continue
                    
                # Save face to temp file
                face_path = image.generate_temp_path()
                face_img.save(face_path)
                
                # Generate embedding
                embedding = image.generate_face_embedding(face_path)
                if not embedding:
                    os.remove(face_path)
                    continue
                    
                # Match against database
                regid = await image.match_face(embedding)
                
                if regid and regid not in [s["regid"] for s in recognized_students]:
                    # Get student details
                    print("if regid")
                    student = await db.query(
                        "SELECT regid, name FROM students WHERE regid = $1",
                        [regid]
                    )
                    if student:
                        recognized_students.append({
                            "regid": regid,
                            "name": student[0]["name"],
                            "confidence": 0.95  # Placeholder for actual confidence
                        })
                
                # Clean up
                os.remove(face_path)
            
            # Clean up
            os.remove(temp_path)
        
        return {"recognized_students": recognized_students}
        
    except HTTPException:
        raise
    except Exception as err:
        print(f"Face recognition error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Face recognition failed"})

@app.get("/attendance/summary/{regid}")
async def get_attendance_summary(regid: str, authorization: str = Header(...)):
    try:
        await get_current_user(authorization)
        regid = validators.validate_regid(regid)

        # Verify student exists
        student = await db.query(
            "SELECT regid FROM students WHERE regid = $1",
            [regid]
        )
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get total working periods
        total_result = await db.query(
            "SELECT COUNT(*) as count FROM attendance WHERE regid = $1",
            [regid]
        )
        total_working_periods = int(total_result[0]["count"]) if total_result else 0

        # Get attended periods
        attended_result = await db.query(
            "SELECT COUNT(*) as count FROM attendance WHERE regid = $1 AND status = 1",
            [regid]
        )
        attended_periods = int(attended_result[0]["count"]) if attended_result else 0

        # Calculate attendance percentage
        if total_working_periods == 0:
            attendance_percentage = 0.0
        else:
            attendance_percentage = round((attended_periods / total_working_periods) * 100, 2)

        return {
            "total_working_periods": total_working_periods,
            "attended_periods": attended_periods,
            "attendance_percentage": attendance_percentage
        }
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Attendance summary error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to load attendance summary"})

# ============ DASHBOARD ENDPOINTS ============

@app.get("/api/dashboard")
async def get_dashboard_stats(authorization: str = Header(...)):
    """Get dashboard statistics"""
    try:
        await get_current_user(authorization)
        today = date.today()
        
        # Get total no.of students
        total_result = await db.query("SELECT COUNT(*) as count FROM students")
        total_students = int(total_result[0]["count"]) if total_result else 0
        
        # Get today's present students count
        present_result = await db.query(
            "SELECT COUNT(DISTINCT regid) as count FROM attendance WHERE date = $1 AND status = 1",
            [today]
        )
        today_present = int(present_result[0]["count"]) if present_result else 0
        
        # Get today attendance rate
        rate_result = await db.query(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status = 1) as present,
                COUNT(*) as total
            FROM attendance
            WHERE date = $1
            """,
            [today]
        )
        if rate_result and rate_result[0]["total"] > 0:
            attendance_rate = round((rate_result[0]["present"] / rate_result[0]["total"]) * 100, 2)
        else:
            attendance_rate = 0.0
        
        # Get classes with attendance today
        classes_result = await db.query(
            "SELECT COUNT(DISTINCT class) as count FROM attendance WHERE date = $1",
            [today]
        )
        classes_today = int(classes_result[0]["count"]) if classes_result else 0
        
        return {
            "todayPresent": today_present,
            "totalStudents": total_students,
            "attendanceRate": attendance_rate,
            "classesToday": classes_today
        }
    except HTTPException:
        raise
    except Exception as err:
        print(f"Dashboard error: {err}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to load dashboard")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
