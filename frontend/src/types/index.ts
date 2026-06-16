// User & Auth Types
export interface User {
  username: string
  email?: string
  role?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

// Student Types
export interface Student {
  id: number
  name: string
  regid: string
  gender: string
  email: string
  mobile: string
  dob: string
  programme: string
  semester: string
  regulation: string
  batch: string
  father_mobile: string
  lab_section: string
  class_section: string
  residence: string
  image?: string
}

export interface StudentFormData {
  name: string
  regid: string
  gender: string
  email: string
  mobile: string
  dob: string
  programme: string
  semester: string
  regulation: string
  batch: string
  fatherMobile: string
  lab_section: string
  class_section: string
  residence: string
}

export interface StudentUpdateData extends StudentFormData {
  oldregid: string
}

// Attendance Types
export interface AttendanceRecord {
  regid: string
  status: 'pending' | 'present' | 'absent'
  matchedImage?: string
  time?: string
}

export interface AttendanceSubmission {
  class: string
  date: string
  students: Array<{
    regid: string
    status: string
    matchedImage?: string
  }>
}

export interface AttendanceEntry {
  date: string
  status: 'Present' | 'Absent'
  time?: string
}

// Dashboard Types
export interface DashboardStats {
  todayPresent: number
  totalStudents: number
  attendanceRate: number
  classesToday: number
}

// API Response Types
export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: any
}

export interface ApiError {
  response?: {
    status: number
    data?: {
      error?: string
      message?: string
    }
  }
  message: string
  code?: string
}

// Camera Types
export interface CapturedImage {
  id: string
  blob: Blob
  url: string
}

export interface CameraHandle {
  open: () => void
  close: () => void
  getImages: () => CapturedImage[]
  clearImages: () => void
}

// UI Component Types
export interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'danger' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  disabled?: boolean
}

export interface InputProps {
  label: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  name?: string
  placeholder?: string
  required?: boolean
  pattern?: string
  className?: string
  error?: string
  helperText?: string
}

export interface SelectProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  name?: string
  options: Array<{ value: string; label: string }>
  required?: boolean
  className?: string
  error?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Dropdown Options Types
export interface DropdownOption {
  value: string
  label: string
}

// Toast Notification Types
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}