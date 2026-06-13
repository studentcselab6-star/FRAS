# FRAS Backend - Face Recognition Attendance System

FastAPI backend for the Face Recognition Attendance System.

## Setup

### 1. Install Dependencies

```bash
cd fras
python -m venv venv
source venv\Scripts\activate  # On Linux: venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://user:password@host:port/database
DB_CONN_LIMIT=10
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3000
```

### 3. Set Up Database

Run the schema SQL on your PostgreSQL database:

```bash
psql -U your_user -d your_database -f schema.sql
```

Or manually execute the SQL in `schema.sql`.

### 4. Set Up Supabase Storage

1. Go to your Supabase project
2. Create a storage bucket named `student_images`
3. Set bucket to private
4. Add storage policies to allow authenticated uploads

### 5. Run the Server

```bash
python main.py
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /auth/login` - User login
  - Body: `username`, `password` (form-data)
  - Returns: `{ access_token, token_type, username }`

- `POST /auth/register` - User registration
  - Body: `username`, `email`, `password` (form-data)
  - Returns: `{ message, username }`

- `POST /change-password` - Change password (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Body: `currentPassword`, `newPassword` (form-data)
  - Returns: `{ message }`

### Students

- `GET /students` - Get all students (requires auth)
- `GET /students/{search}` - Search students (requires auth)
- `POST /students` - Add new student (requires auth)
  - Body: Form data with all student fields + optional `images` file array
- `POST /update-students` - Update student (requires auth)
  - Body: Form data with all student fields + `oldregid`
- `DELETE /students/{regid}` - Delete student (requires auth)

### Attendance

- `POST /attendance` - Submit attendance (requires auth)
  - Body: `{ class, date, students: [{ regid, status }] }`
- `GET /attendance/today` - Get today's attendance (requires auth)
- `GET /attendance/student/{student_id}` - Get student attendance (requires auth)
  - Query: `fromDate`, `toDate`

### Dashboard

- `GET /api/dashboard` - Get dashboard stats (requires auth)
  - Returns: `{ todayPresent, totalStudents, attendanceRate, classesToday }`

## Testing with Frontend

1. Start backend: `python main.py`
2. Start frontend: `cd ../fras-react && npm run dev`
3. The frontend proxy is configured to forward API requests to `http://localhost:3000`

## Database Schema

The application requires these tables:

- `users` - User authentication
- `students` - Student records
- `attendance` - Attendance records

See `schema.sql` for complete schema.

## Image Storage

Student images are stored in Supabase Storage bucket `student_images` with structure:
```
{batch}/{programme}-{class_section}/{regid}_{filename}.jpg
```

## Security Notes

- Change the default admin password immediately
- Use a strong `JWT_SECRET` in production
- Enable HTTPS in production
- Set appropriate CORS origins
- Review Supabase storage policies