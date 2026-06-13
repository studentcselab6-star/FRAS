-- FRAS Database Schema
-- Run this on your PostgreSQL database

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    regid VARCHAR(50) UNIQUE NOT NULL,
    regid_lower VARCHAR(50),
    gender VARCHAR(10) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    dob DATE NOT NULL,
    programme VARCHAR(50) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    regulation VARCHAR(20) NOT NULL,
    batch VARCHAR(20) NOT NULL,
    father_mobile VARCHAR(20) NOT NULL,
    lab_section VARCHAR(10) NOT NULL,
    class_section VARCHAR(10) NOT NULL,
    residence VARCHAR(50) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_students_regid ON students(regid);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_section);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    regid VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    class VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    marked_by VARCHAR(100),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(regid, date),
    FOREIGN KEY (regid) REFERENCES students(regid) ON DELETE CASCADE
);

-- Create indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_regid ON attendance(regid);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class);
CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance(date, status);

-- Insert default admin user (password: admin123)
-- Change this password immediately in production!
INSERT INTO users (username, email, password) 
VALUES (
    'admin',
    'admin@fras.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu'
)
ON CONFLICT (username) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();