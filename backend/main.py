from fastapi import FastAPI, Request, File, Form, UploadFile, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from supabase import create_client
from dotenv import load_dotenv
from datetime import date, datetime, timedelta
from typing import List
from passlib.context import CryptContext
from jose import JWTError, jwt
import uvicorn
import os
import db
from fastapi.middleware.cors import CORSMiddleware

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
    "http://localhost:3000"
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
        raise HTTPException(status_code=401, detail="Invalid token fformat")

# ============ AUTH ENDPOINTS ============

@app.post("/auth/login")
async def login(username: str = Form(...), password: str = Form(...)):
    """User login - returns JWT token"""
    try:
        users = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        )
        
        if not users or len(users) == 0:
            raise HTTPException(status_code=401, detail="No user found")

        user = users[0]
        
        if not pwd_context.verify(password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid password")
        
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
        return JSONResponse(status_code=500, content={"error": str(err)})

@app.post("/auth/register")
async def register(username: str = Form(...), email: str = Form(...), password: str = Form(...)):
    """User registration"""
    try:
        # Check if user exists
        existing = await db.query(
            "SELECT * FROM users WHERE username = $1 OR email = $2",
            [username, email]
        )
        if existing and len(existing) > 0:
            raise HTTPException(status_code=400, detail="Username or email already exists")
        # Hash password
        hashed_password = pwd_context.hash(password)
        # Insert user
        await db.query(
            "INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4)",
            [username, email, hashed_password, datetime.utcnow()]
        )
        return {"message": "User registered successfully", "username": username}
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

@app.post("/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    authorization: str = Form(...)
):
    """Change password for authenticated user"""
    try:
        current_user = await get_current_user(authorization)
        
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
    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

# ============ STUDENT ENDPOINTS ============

@app.get("/students/{search}")
async def get_students(search: str, authorization: str = Header(...)):
    """Search students by name, email, or regid"""
    try:
        await get_current_user(authorization)
        #search_term = search.replace("%", " ")
        print(search)
        students = await db.query(
            "SELECT * FROM students WHERE name LIKE $1 OR email LIKE $1 OR regid LIKE $1",
            [f"%{search}%"]
        )
        return await enrich_with_images(students)
    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

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
    images: List[UploadFile] = File([]),
    authorization: str = Header(...)
):
    """Add new student with optional images"""
    try:
        await get_current_user(authorization)
        dob = date.fromisoformat(dob)
        regid = regid.upper()
        
        await db.query(
            """
            INSERT INTO students (
                name, regid, email, mobile, dob, class_section,
                father_mobile, gender, lab_section, programme,
                regulation, batch, residence, semester
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
            [name, regid, email, mobile, dob, class_section, fatherMobile,
             gender, lab_section, programme, regulation, batch, residence, semester]
        )
        
        # Upload images to Supabase if provided
        if images and supabase:
            for img in images:
                contents = await img.read()
                filename = f"{batch}/{programme}-{class_section}/{regid}.jpg"
                supabase.storage.from_(BUCKET).upload(filename, contents)

    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

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
    authorization: str = Header(...)
):
    """Update existing student"""
    try:
        await get_current_user(authorization)
        dob = date.fromisoformat(dob)
        regid = regid.upper()

        await db.query(
            """
            UPDATE students SET
                name=$1, regid=$2, email=$3, mobile=$4, dob=$5,
                class_section=$6, father_mobile=$7, gender=$8,
                lab_section=$9, programme=$10, regulation=$11,
                batch=$12, residence=$13, semester=$14
            WHERE regid = $15
            """,
            [name, regid, email, mobile, dob, class_section, fatherMobile,
             gender, lab_section, programme, regulation, batch, residence,
             semester, oldregid]
        )
        return {"message": "Student updated successfully"}
    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

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
        return JSONResponse(status_code=500, content={"error": str(err)})
# ============ ATTENDANCE ENDPOINTS ============

@app.post("/attendance")
async def submit_attendance(data: dict, authorization: str = Form(...)):
    """Submit attendance for a class"""
    try:
        await get_current_user(authorization)
        
        class_name = data.get("class")
        attendance_date = data.get("date")
        students = data.get("students", [])
        
        if not class_name or not attendance_date or not students:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Insert attendance records
        for student in students:
            await db.query(
                """
                INSERT INTO attendance (regid, date, class, status, marked_by, marked_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (regid, date) DO UPDATE SET
                    status = EXCLUDED.status,
                    marked_by = EXCLUDED.marked_by,
                    marked_at = EXCLUDED.marked_at
                """,
                [
                    student["regid"],
                    attendance_date,
                    class_name,
                    student.get("status", "present"),
                    "system",
                    datetime.utcnow()
                ]
            )
        
        return {"message": "Attendance submitted successfully", "count": len(students)}
    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

@app.get("/attendance/today")
async def get_today_attendance(authorization: str = Form(...)):
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
        return JSONResponse(status_code=500, content={"error": str(err)})

@app.get("/attendance/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    fromDate: str,
    toDate: str,
    authorization: str = Form(...)
):
    """Get attendance records for a specific student"""
    try:
        await get_current_user(authorization)
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
    except HTTPException:
        raise
    except Exception as err:
        return JSONResponse(status_code=500, content={"error": str(err)})

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
        return JSONResponse(status_code=500, content={"error": str(err)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
