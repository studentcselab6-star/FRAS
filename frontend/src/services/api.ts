import axios, { AxiosError } from 'axios'
import type { ApiError } from '../types'
import { getErrorMessage } from '../utils/apiHelper'
import { useToast } from '../components/ui/Toast'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL

if (!API_BASE_URL) {
  console.warn('VITE_BACKEND_URL not set, using default localhost:3000')
}

const toast = useToast()

const api = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error);
    
    // Automatically trigger a UI pop-up for any API error
    toast.error(message); 
    
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Extract user-friendly error message from API response
export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>
    return axiosError.response?.data?.error || 
           axiosError.response?.data?.message || 
           axiosError.message || 
           'An unexpected error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// Auth APIs
export const authApi = {
  login: (username: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
   register: (username: string, email: string, password: string ) => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    formData.append('email', email)

    return api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/change-password', { currentPassword, newPassword }),
}

// Student APIs
export const studentApi = {
  search: (query: string) => {
    return api.get(`/students/${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth")}`
      }
    })
  },
  create: (formData: FormData) => {
    return api.post('/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${localStorage.getItem("auth")}`
       },
    })
  },
  update: (formData: FormData) =>
    api.post('/update-students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (regid: string) => api.delete(`/students/${encodeURIComponent(regid)}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth")}`
    }
  }),
}

// Attendance APIs
export const attendanceApi = {
  submit: (data: { class: string; date: string; students: any[] }) =>
    api.post('/attendance', data),
  getByStudent: (studentId: string, fromDate: string, toDate: string) =>
    api.get(`/attendance/student/${studentId}`, {
      params: { fromDate, toDate },
    }),
  getToday: () => api.get('/attendance/today'),
}

// Dashboard APIs
export const dashboardApi = {
  getStats: () => {
    const authentication = localStorage.getItem("auth")

    return api.get("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${authentication}`
      }
    })
  }
}

export default api
