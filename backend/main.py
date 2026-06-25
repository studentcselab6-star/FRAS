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

load_dotenv()

# Configuration
PORT = int(os.getenv("PORT", 3000))
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
BUCKET = "student_images"

# Initialize Supabase
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    print(f"Server running on http://0.0.0.0:{PORT}")
    yield
    await db.close_pool()

app = FastAPI(lifespan=lifespan)
origins = [
    "https://fras-virid.vercel.app",
    "https://vinaykatikireddy.is-a.dev",
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
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming: {request.method} {request.url.path}")
    return await call_next(request)

# Dependency: Get current user from JWT
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

@app.get("/")
def home():
    return {"message": "API is running..."}

# ============ AUTH ENDPOINTS ============

@app.post("/auth/login")
async def login(username: str = Form(...), password: str = Form(...)):
    """User login - returns JWT token"""
    try:
        if not username or not password:
            raise HTTPException(status_code=401, detail="Username and password are required")

        users = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        )

        if not users or len(users) == 0:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = users[0]

        if not pwd_context.verify(password, user["password"]):
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
        validators.validate_password(password)

        existing = await db.query(
            "SELECT * FROM users WHERE username = $1 OR email = $2",
            [username, email]
        )
        if existing and len(existing) > 0:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        hashed_password = pwd_context.hash(password)
        await db.query(
            "INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4)",
            [username, email, hashed_password, datetime.utcnow()]
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
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    authorization: str = Header(...)
):
    """Change password for authenticated user"""
    try:
        current_user = await get_current_user(authorization)

        if not current_password:
            raise ValueError("Current password is required")
        validators.validate_password(new_password)

        users = await db.query("SELECT * FROM users WHERE username = $1", [current_user])
        if not users:
            raise HTTPException(status_code=404, detail="User not found")

        user = users[0]
        if not pwd_context.verify(current_password, user["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        hashed_password = pwd_context.hash(new_password)
        await db.query(
            "UPDATE users SET password = $1 WHERE username = $2",
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

@app.get("/students/filter")
async def filter_students(
    programme: str = "",
    batch: str = "",
    section: str = "",
    semester: str = "",
    authorization: str = Header(...),
):
    """Get students filtered by programme, batch, class_section, and semester"""
    try:
        await get_current_user(authorization)
        conditions = []
        params = []
        idx = 1
        print("EU")
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

        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        print(f"Filtering students with conditions: {where_clause} and params: {params}")
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
async def get_students(search: str, authorization: str = Header(...)):
    """Search students by name, email, or regid"""
    try:
        await get_current_user(authorization)
        # Strip LIKE wildcards to prevent forced full-table scans
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

async def enrich_with_images(students):
    """Add signed image URLs to student records"""
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
    authorization: str = Header(...)
):
    """Add new student with optional profile photo"""
    try:
        await get_current_user(authorization)
        print(residence)
        # Validate every field — frontend checks are UX only
        name = validators.validate_name(name)
        regid = validators.validate_regid(regid)
        email = validators.validate_email(email)
        mobile = validators.validate_phone(mobile, "Mobile")
        father_mobile = validators.validate_phone(fatherMobile, "Father's mobile")
        dob_parsed = validators.validate_dob(dob)
        gender = validators.validate_gender(gender)
        class_section = validators.validate_in(class_section, "Class section", validators.VALID_SECTIONS)
        lab_section = validators.validate_in(lab_section, "Lab section", validators.VALID_LAB_SECTIONS)
        programme = validators.validate_in(programme, "Programme", validators.VALID_PROGRAMMES)
        regulation = validators.validate_in(regulation, "Regulation", validators.VALID_REGULATIONS)
        batch = validators.validate_in(batch, "Batch", validators.VALID_BATCHES)
        residence = validators.validate_in(residence, "Residence", validators.VALID_RESIDENCES)
        semester = validators.validate_in(semester, "Semester", validators.VALID_SEMESTERS)
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

        if image and supabase:
            contents = await image.read()
            filename = f"{batch}/{programme}-{class_section}/{regid}.jpg"
            supabase.storage.from_(BUCKET).upload(filename, contents)

    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Add student error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to add student"})

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
    authorization: str = Header(...)
):
    """Update existing student"""
    try:
        await get_current_user(authorization)

        # Validate every field
        name = validators.validate_name(name)
        regid = validators.validate_regid(regid)
        email = validators.validate_email(email)
        mobile = validators.validate_phone(mobile, "Mobile")
        father_mobile = validators.validate_phone(fatherMobile, "Father's mobile")
        dob_parsed = validators.validate_dob(dob)
        gender = validators.validate_gender(gender)
        class_section = validators.validate_in(class_section, "Class section", validators.VALID_SECTIONS)
        lab_section = validators.validate_in(lab_section, "Lab section", validators.VALID_LAB_SECTIONS)
        programme = validators.validate_in(programme, "Programme", validators.VALID_PROGRAMMES)
        regulation = validators.validate_in(regulation, "Regulation", validators.VALID_REGULATIONS)
        batch = validators.validate_in(batch, "Batch", validators.VALID_BATCHES)
        residence = validators.validate_in(residence, "Residence", validators.VALID_RESIDENCES)
        semester = validators.validate_in(semester, "Semester", validators.VALID_SEMESTERS)
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

        # ponytail: handle image rename/move when regid changes
        if supabase:
            new_filename = f"{batch}/{programme}-{class_section}/{regid}.jpg"
            old_filename = f"{batch}/{programme}-{class_section}/{oldregid_upper}.jpg"
            regid_changed = oldregid_upper != regid

            if image:
                contents = await image.read()
                # Remove destination if it exists (overwrite)
                try:
                    supabase.storage.from_(BUCKET).remove([new_filename])
                except Exception:
                    pass
                supabase.storage.from_(BUCKET).upload(new_filename, contents)
                # Clean up old file if regid changed
                if regid_changed:
                    try:
                        supabase.storage.from_(BUCKET).remove([old_filename])
                    except Exception:
                        pass
            elif regid_changed:
                # No new image but regid changed — move old file to new path
                try:
                    old_data = supabase.storage.from_(BUCKET).download(old_filename)
                    try:
                        supabase.storage.from_(BUCKET).remove([new_filename])
                    except Exception:
                        pass
                    supabase.storage.from_(BUCKET).upload(new_filename, old_data)
                    supabase.storage.from_(BUCKET).remove([old_filename])
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

        students = await db.query(
            """
            SELECT batch, programme, class_section, regid
            FROM students
            WHERE regid = $1
            """,
            [regid]
        )

        if not students:
            raise HTTPException(status_code=404, detail="Student not found")

        student = students[0]

        if supabase:
            filename = (f"{student['batch']}/{student['programme']}-{student['class_section']}/{student['regid']}.jpg")

            try:
                supabase.storage.from_(BUCKET).remove([filename])
            except Exception as e:
                print(f"Storage delete failed: {e}")

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

@app.post("/attendance")
async def submit_attendance(data: dict, authorization: str = Header(...)):
    """Submit attendance for a class"""
    try:
        current_user = await get_current_user(authorization)

        class_name = data.get("class", "").strip()
        period = data.get("period")
        students = data.get("students", [])

        if not class_name or not isinstance(students, list) or not students or period is None:
            raise HTTPException(status_code=400, detail="Missing required fields: class, period, and students")

        # Validate class
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
        raise HTTPException(
            status_code=409,
            detail=f"Attendance already recorded"
        )
    except HTTPException:
        raise
    except Exception as err:
        print(f"Submit attendance error: {err}")
        return JSONResponse(status_code=500, content={"error": "Failed to submit attendance"})
    

@app.get("/attendance/today")
async def get_today_attendance(authorization: str = Header(...)):
    """Get today's attendance records"""
    try:
        await get_current_user(authorization)
        today = date.today().isoformat()
        records = await db.query(
            "SELECT * FROM attendance WHERE date = $1",
            [today]
        )
        return records
    except HTTPException:
        raise
    except Exception as err:
        print(f"Today attendance error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to load attendance"})

@app.get("/attendance/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    fromDate: str,
    toDate: str,
    authorization: str = Header(...)
):
    """Get attendance records for a specific student"""
    try:
        await get_current_user(authorization)
        # Validate date params
        for label, val in [("fromDate", fromDate), ("toDate", toDate)]:
            try:
                date.fromisoformat(val)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid date format for {label}")
        records = await db.query(
            """
            SELECT date, status,
                   TO_CHAR(marked_at, 'HH12:MI AM') as time
            FROM attendance
            WHERE regid = $1 AND date BETWEEN $2 AND $3
            ORDER BY date DESC
            """,
            [student_id, fromDate, toDate]
        )
        return records
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except HTTPException:
        raise
    except Exception as err:
        print(f"Student attendance error: {err}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": "Failed to load attendance"})


@app.get("/attendance/summary/{regid}")
async def get_attendance_summary(
    regid: str,
    authorization: str = Header(...)
):
    """Get attendance summary for a specific student"""
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
        today = date.today().isoformat()
        
        # Get total students
        total_result = await db.query("SELECT COUNT(*) as count FROM students")
        total_students = int(total_result[0]["count"]) if total_result else 0
        
        # Get today's present count
        present_result = await db.query(
            "SELECT COUNT(DISTINCT regid) as count FROM attendance WHERE date = $1 AND status = 'present'",
            [today]
        )
        today_present = int(present_result[0]["count"]) if present_result else 0
        
        # Get attendance rate (last 7 days)
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        rate_result = await db.query(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'present') as present,
                COUNT(*) as total
            FROM attendance
            WHERE date >= $1
            """,
            [week_ago]
        )
        if rate_result and rate_result[0]["total"] > 0:
            attendance_rate = round((rate_result[0]["present"] / rate_result[0]["total"]) * 100, 1)
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
        return JSONResponse(status_code=500, content={"error": "Failed to load dashboard"})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
