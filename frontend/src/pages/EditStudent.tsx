import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { studentApi } from '../services/api'
import { Button } from '../components/ui/Button'

interface Student {
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
}

const EditStudent: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Get student data from location state (passed from Students page)
  const student = location.state?.student as Student | null
  
  const [formData, setFormData] = useState({
    name: '',
    regid: '',
    gender: '',
    email: '',
    mobile: '',
    dob: '',
    programme: '',
    semester: '',
    regulation: '',
    batch: '',
    father_mobile: '',
    lab_section: '',
    class_section: '',
    residence: '',
  })

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        regid: student.regid,
        gender: student.gender,
        email: student.email,
        mobile: student.mobile,
        dob: student.dob.split('T')[0],
        programme: student.programme,
        semester: student.semester,
        regulation: student.regulation,
        batch: student.batch,
        father_mobile: student.father_mobile,
        lab_section: student.lab_section,
        class_section: student.class_section,
        residence: student.residence,
      })
      setLoading(false)
    } else {
      // No student data, redirect to Students page
      navigate('/students')
    }
  }, [student, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key === 'father_mobile' ? 'fatherMobile' : key, value)
      })
      formDataToSend.append('oldregid', student!.regid)

      await studentApi.update(formDataToSend)
      alert('Student updated successfully!')
      navigate('/students')
    } catch (err: any) {
      alert('Failed to update student: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const programmeOptions = [
    { value: '', label: 'Select Programme' },
    { value: 'BCA', label: 'BCA' },
    { value: 'BBA', label: 'BBA' },
    { value: 'MCA', label: 'MCA' },
    { value: 'MBA', label: 'MBA' },
    { value: 'S&H', label: 'S&H' },
    { value: 'CSE', label: 'CSE' },
    { value: 'AIML', label: 'AIML' },
    { value: 'CSEDS', label: 'CSEDS' },
    { value: 'CSEAIDS', label: 'CSEAIDS' },
    { value: 'CSECS', label: 'CSECS' },
    { value: 'CSEBS', label: 'CSEBS' },
    { value: 'IT', label: 'IT' },
    { value: 'ECE', label: 'ECE' },
    { value: 'EEE', label: 'EEE' },
    { value: 'MECH', label: 'Mech' },
    { value: 'RBT', label: 'Robotics' },
    { value: 'CIV', label: 'Civil' },
  ]

  const semesterOptions = [
    { value: '', label: 'Select Semester' },
    { value: 'First Semester', label: 'First Semester' },
    { value: 'Second Semester', label: 'Second Semester' },
    { value: 'Third Semester', label: 'Third Semester' },
    { value: 'Fourth Semester', label: 'Fourth Semester' },
    { value: 'Fifth Semester', label: 'Fifth Semester' },
    { value: 'Sixth Semester', label: 'Sixth Semester' },
    { value: 'Seventh Semester', label: 'Seventh Semester' },
    { value: 'Eighth Semester', label: 'Eighth Semester' },
  ]

  const regulationOptions = [
    { value: '', label: 'Select Regulation' },
    { value: 'R23', label: 'R23' },
    { value: 'R24', label: 'R24' },
    { value: 'R25', label: 'R25' },
    { value: 'R26', label: 'R26' },
    { value: 'R27', label: 'R27' },
    { value: 'R28', label: 'R28' },
    { value: 'R29', label: 'R29' },
  ]

  const batchOptions = [
    { value: '', label: 'Select Batch' },
    { value: '2020-2024', label: '2020-2024' },
    { value: '2021-2025', label: '2021-2025' },
    { value: '2022-2026', label: '2022-2026' },
    { value: '2023-2027', label: '2023-2027' },
    { value: '2022-2024', label: '2022-2024' },
    { value: '2023-2025', label: '2023-2025' },
    { value: '2020-2022', label: '2020-2022' },
    { value: '2019-2023', label: '2019-2023' },
    { value: '2018-2022', label: '2018-2022' },
    { value: '2024-2028', label: '2024-2028' },
    { value: '2024-2027', label: '2024-2027' },
    { value: '2024-2026', label: '2024-2026' },
    { value: '2025-2028', label: '2025-2028' },
    { value: '2025-2027', label: '2025-2027' },
  ]

  const sectionOptions = [
    { value: '', label: 'Select Section' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'H', label: 'H' },
    { value: 'I', label: 'I' },
  ]

  const residenceOptions = [
    { value: '', label: 'Select Residence' },
    { value: 'hosteler', label: 'Hosteler' },
    { value: 'bus', label: 'Bus' },
    { value: 'own transport', label: 'Own Transport' },
  ]

  const genderOptions = [
    { value: '', label: 'Select Gender' },
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-fras-gold mb-4" />
          <p className="text-white text-lg">Loading student data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-user-edit text-fras-gold" />
        Edit Student
      </h1>

      <div className="bg-white rounded-lg shadow-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registration ID</label>
              <input
                type="text"
                name="regid"
                value={formData.regid}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="form-select"
              >
                {genderOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                pattern="[0-9]{10}"
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Programme</label>
              <select
                name="programme"
                value={formData.programme}
                onChange={handleChange}
                required
                className="form-select"
              >
                {programmeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                required
                className="form-select"
              >
                {semesterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Regulation</label>
              <select
                name="regulation"
                value={formData.regulation}
                onChange={handleChange}
                required
                className="form-select"
              >
                {regulationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                required
                className="form-select"
              >
                {batchOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Father's Mobile</label>
              <input
                type="tel"
                name="father_mobile"
                value={formData.father_mobile}
                onChange={handleChange}
                pattern="[0-9]{10}"
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lab Section</label>
              <select
                name="lab_section"
                value={formData.lab_section}
                onChange={handleChange}
                required
                className="form-select"
              >
                <option value="">Select Lab Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class Section</label>
              <select
                name="class_section"
                value={formData.class_section}
                onChange={handleChange}
                required
                className="form-select"
              >
                {sectionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Residence</label>
              <select
                name="residence"
                value={formData.residence}
                onChange={handleChange}
                required
                className="form-select"
              >
                {residenceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/students')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              isLoading={saving}
            >
              <i className="fas fa-save" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditStudent