import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { studentApi } from '../services/api'
import { Button } from '../components/ui/'
import {
  programmeOptions,
  semesterOptions,
  regulationOptions,
  batchOptions,
  sectionOptions,
  residenceOptions,
} from '../constants/options'
import { CameraHandle, CapturedImage } from '../types'
import { Camera } from '../components/Camera'
import { Student } from '../types'

const EditStudent: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<CameraHandle>(null)
  const [images, setImages] = useState<CapturedImage[]>([])
  const navigate = useNavigate()
  const location = useLocation()
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
    image: ''
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
        image: student.image
      })
    } else {
      // No student data, redirect to Students page
      navigate('/students-section')
    }
  }, [student, navigate])

  const handleImagesChange = (newImages: CapturedImage[]) => {
    setImages(newImages)
  }

  const openCamera = () => {
    cameraRef.current?.open()
  }

  useEffect(() => {
  if (student?.image) {
    setImages([
      {
        id: 'existing',
        url: student.image,
      } as CapturedImage,
    ])
  }
}, [student])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImages([
      {
        id: crypto.randomUUID(),
        blob: file,
        url: URL.createObjectURL(file),
      } as CapturedImage,
    ])
  }

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

      if (images[0]?.blob) {
        formDataToSend.append('image', images[0].blob)
      }
      await studentApi.update(formDataToSend)
      alert('Student updated successfully!')
      navigate('/students-section')
    } catch (err: any) {
      alert('Failed to update student: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-user-edit text-fras-gold" />
        Edit Student
      </h1>

      <div className="bg-white rounded-lg shadow-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Student Photo
            </h3>
          
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openCamera}
                className="px-6 py-3 bg-fras-gold text-white rounded-lg"
              >
                <i className="fas fa-camera" />
                Take Photo
              </button>
          
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg"
              >
                <i className="fas fa-upload" />
                Upload Photo
              </button>
            </div>
          
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          Current Photo: 
            <img
              src={student?.image}
              alt="Student"
              className="mt-4 w-32 h-32 rounded-lg object-cover border"
            />
          
            <Camera
              ref={cameraRef}
              onImagesChange={handleImagesChange}
            />
          </div>

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
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
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
              className="text-yellow-500"
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