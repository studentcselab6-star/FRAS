# FRAS Complete Setup Guide

## Quick Start

### 1. Database Setup (PostgreSQL)

```sql
-- Create database
CREATE DATABASE fras_db;

Use any PostgreSQL client to run `schema.sql`.

### 2. Supabase Setup

1. Create project at https://supabase.com
2. Get Project URL and Service Role Key from Settings → API
3. Create storage bucket `student_images` (private)
4. Add storage policy:
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student_images');
```

### 3. Backend Setup

```bash
cd fras

# Create virtual environment
python -m venv venv

# Activate
# Windows: venv\Scripts\activate.bat
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY  
# - DATABASE_URL
# - JWT_SECRET (generate random string)

# Run server
python main.py
```

Server starts at: http://localhost:3000

### 4. Frontend Setup

```bash
cd fras-react

# Install dependencies
npm install

# Update .env (already configured)
VITE_API_URL=http://localhost:3000

# Run dev server
npm run dev
```

Frontend starts at: http://localhost:5173

### 5. Test the Application

1. Open http://localhost:5173
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`
3. Change your password immediately!

## Default Credentials

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT:** Change this password after first login!

## Project Structure

```
face-recognition-attendance-system/
├── fras/                    # Backend (FastAPI)
│   ├── main.py             # Main application
│   ├── db.py               # Database connection
│   ├── schema.sql          # Database schema
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
│
└── fras-react/             # Frontend (React + TypeScript)
    ├── src/
    │   ├── pages/          # Page components
    │   ├── components/     # Reusable components
    │   ├── services/       # API client
    │   ├── types/          # TypeScript types
    │   └── utils/          # Utilities
    └── package.json
```

## API Testing with curl

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -d "username=admin" \
  -d "password=admin123"
```

### Get Students (with token)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/students
```

### Add Student
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=John Doe" \
  -F "regid=2024001" \
  -F "email=john@example.com" \
  -F "mobile=9876543210" \
  -F "dob=2000-01-01" \
  -F "gender=M" \
  -F "programme=CSE" \
  -F "semester=Third Semester" \
  -F "regulation=R23" \
  -F "batch=2022-2026" \
  -F "class_section=A" \
  -F "lab_section=A" \
  -F "residence=hosteler" \
  -F "fatherMobile=9876543211" \
  -F "images=@photo1.jpg" \
  http://localhost:3000/students
```

### Get Dashboard Stats
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard
```

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure port 3000 is not in use

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check VITE_API_URL in fras-react/.env
- Check browser console for CORS errors

### Login fails
- Verify database has users table
- Check if default admin user exists:
```sql
SELECT * FROM users WHERE username = 'admin';
```

### Images not showing
- Check Supabase bucket exists
- Verify SUPABASE_URL and key in .env
- Check storage policies allow access

## Production Deployment

### Backend
1. Use production PostgreSQL instance
2. Set strong JWT_SECRET
3. Enable HTTPS
4. Set appropriate CORS origins in main.py
5. Use environment variables from secrets manager

### Frontend
1. Build: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Update VITE_API_URL to production backend URL

## Database Backup

```bash
# Backup
pg_dump -U your_user fras_db > backup.sql

# Restore
psql -U your_user fras_db < backup.sql
```

## Next Steps

1. ✅ Backend complete with all endpoints
2. ✅ Frontend complete with all pages
3. ✅ Authentication working
4. ⏳ Add face recognition integration
5. ⏳ Add batch student import
6. ⏳ Add attendance reports/export
7. ⏳ Add real-time notifications

---

**Support:** For issues, check the logs in both backend and frontend consoles.