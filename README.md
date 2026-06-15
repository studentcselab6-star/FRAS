# FRAS - Face Recognition Attendance System

A full-stack Face Recognition Attendance System with a React frontend and FastAPI backend.

## Tech Stack
- React + TypeScript + Vite + Tailwind CSS for Frontend
- FastAPI for Backend
- JWT Authentication
- Supabase for Database
- Axios

## Setup

### Backend
```bash
cd backend/
python -m venv venv
source venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend/
npm install
npm run dev
```

## Main Features
- User authentication
- Student management
- Attendance tracking
- Dashboard statistics
- Camera integration
- Profile management

## API
- `/auth/*`
- `/students/*`
- `/attendance/*`
- `/api/dashboard`

## Future Improvements
- Face recognition model
- Analytics & reports
- Bulk import/export

## Security
- Strong JWT secret
- HTTPS
- Proper CORS configuration

