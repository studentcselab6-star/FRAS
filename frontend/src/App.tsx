import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './pages/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import AddStudent from './pages/AddStudent'
import EditStudent from './pages/EditStudent'
import TakeAttendance from './pages/TakeAttendance'
import Profile from './pages/Profile'
import ManageFaculty from './pages/faculty/ManageFaculty'
import AddFaculty from './pages/faculty/AddFaculty'
import ManageSubjects from './pages/faculty/ManageSubjects'
import FacultyAssignments from './pages/faculty/FacultyAssignments'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = localStorage.getItem('auth')
  if (!auth) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={ <Layout /> }>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="students-section"
            element={
              <ProtectedRoute>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="add-student"
            element={
              <ProtectedRoute>
                <AddStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="edit-student"
            element={
              <ProtectedRoute>
                <EditStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="take-attendance"
            element={
              <ProtectedRoute>
                <TakeAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="manage-faculty"
            element={
              <ProtectedRoute>
                <ManageFaculty />
              </ProtectedRoute>
            }
          />
          <Route
            path="add-faculty"
            element={
              <ProtectedRoute>
                <AddFaculty />
              </ProtectedRoute>
            }
          />
          <Route
            path="manage-subjects"
            element={
              <ProtectedRoute>
                <ManageSubjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="faculty-assignments"
            element={
              <ProtectedRoute>
                <FacultyAssignments />
              </ProtectedRoute>
            }
          />
          
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App