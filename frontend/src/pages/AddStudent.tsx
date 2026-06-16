import { useState, useRef, useMemo } from 'react'
import { studentApi } from '../services/api'
import { getApiErrorMessage } from '../services/api'
import { Button } from '../components/ui/Button'
import type { CameraHandle, CapturedImage, StudentFormData } from '../types'
import { Camera } from '../components/Camera'
import { useToast } from '../components/ui/Toast'
import { isValidPhone, isValidEmail } from '../utils/validators'
import {
  genderOptions,
  programmeOptions,
  semesterOptions,
  regulationOptions,
  batchOptions,
  sectionOptions,
  residenceOptions,
} from '../constants/options'

const AddStudent = () => {
  const cameraRef = useRef<CameraHandle>(null)
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<CapturedImage[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({})

  const [formData, setFormData] = useState<StudentFormData>({
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
    fatherMobile: '',
    lab_section: '',
    class_section: '',
    residence: '',
  })

  const handleImagesChange = (newImages: CapturedImage[]) => {
    setImages(newImages)
  }

  const openCamera = () => {
    cameraRef.current?.open()
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof StudentFormData, string>> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.regid.trim()) newErrors.regid = 'Reg ID is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!isValidEmail(formData.email)) newErrors.email = 'Valid email is required'
    if (!isValidPhone(formData.mobile)) newErrors.mobile = 'Valid 10-digit mobile number is required'
    if (!formData.dob) newErrors.dob = 'Date of birth is required'
    if (!formData.programme) newErrors.programme = 'Programme is required'
    if (!formData.semester) newErrors.semester = 'Semester is required'
    if (!formData.regulation) newErrors.regulation = 'Regulation is required'
    if (!formData.batch) newErrors.batch = 'Batch is required'
    if (!isValidPhone(formData.fatherMobile)) newErrors.fatherMobile = 'Valid father\'s mobile is required'
    if (!formData.lab_section) newErrors.lab_section = 'Lab section is required'
    if (!formData.class_section) newErrors.class_section = 'Class section is required'
    if (!formData.residence) newErrors.residence = 'Residence is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.warning('Please fix the form errors')
      return
    }

    if (images.length === 0) {
      toast.warning('Please capture at least one image')
      return
    }

    setLoading(true)
    try {
      const formDataToSend = new FormData()

      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value)
      })

      images.forEach((img, index) => {
        formDataToSend.append('images', img.blob, `photo_${index}.jpg`)
      })

      const response = await studentApi.create(formDataToSend)
      
      
      toast.success('Student added successfully!')
      setFormData({
        name: '', regid: '', gender: '', email: '', mobile: '', dob: '',
        programme: '', semester: '', regulation: '', batch: '',
        fatherMobile: '', lab_section: '', class_section: '', residence: '',
      })
      setImages([])
      setErrors({})
      cameraRef.current?.clearImages()
      
    } catch (err: any) {
      console.error('Error adding student:', err)
      toast.error(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof StudentFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-user-plus text-fras-gold" />
        Add New Student
      </h1>

      <div className="bg-white rounded-lg shadow-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Camera Section */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Student Photo</h3>
            <button
              type="button"
              onClick={openCamera}
              className="px-6 py-3 bg-fras-gold text-white rounded-lg hover:bg-fras-gold-dark transition-colors flex items-center gap-2"
            >
              <i className="fas fa-camera" />
              Open Camera
            </button>
            {images.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {images.length} photo(s) captured
              </p>
            )}
            <Camera ref={cameraRef} onImagesChange={handleImagesChange} />
          </div>

          {/* Personal Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reg ID *</label>
                <input
                  type="text"
                  name="regid"
                  value={formData.regid}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.regid ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter registration ID"
                />
                {errors.regid && <p className="mt-1 text-sm text-red-600">{errors.regid}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {genderOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.dob ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.dob && <p className="mt-1 text-sm text-red-600">{errors.dob}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="student@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="9876543210"
                  pattern="[0-9]{10}"
                />
                {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>}
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programme *</label>
                <select
                  name="programme"
                  value={formData.programme}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.programme ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {programmeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.programme && <p className="mt-1 text-sm text-red-600">{errors.programme}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.semester ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {semesterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.semester && <p className="mt-1 text-sm text-red-600">{errors.semester}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regulation *</label>
                <select
                  name="regulation"
                  value={formData.regulation}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.regulation ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {regulationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.regulation && <p className="mt-1 text-sm text-red-600">{errors.regulation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.batch ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {batchOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.batch && <p className="mt-1 text-sm text-red-600">{errors.batch}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lab Section *</label>
                <select
                  name="lab_section"
                  value={formData.lab_section}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.lab_section ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Lab Section</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
                {errors.lab_section && <p className="mt-1 text-sm text-red-600">{errors.lab_section}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Section *</label>
                <select
                  name="class_section"
                  value={formData.class_section}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.class_section ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {sectionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.class_section && <p className="mt-1 text-sm text-red-600">{errors.class_section}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residence *</label>
                <select
                  name="residence"
                  value={formData.residence}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.residence ? 'border-red-500' : 'border-gray-300'}`}
                >
                  {residenceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.residence && <p className="mt-1 text-sm text-red-600">{errors.residence}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Mobile *</label>
                <input
                  type="tel"
                  name="fatherMobile"
                  value={formData.fatherMobile}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fras-gold focus:border-transparent ${errors.fatherMobile ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="9876543210"
                  pattern="[0-9]{10}"
                />
                {errors.fatherMobile && <p className="mt-1 text-sm text-red-600">{errors.fatherMobile}</p>}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormData({
                  name: '', regid: '', gender: '', email: '', mobile: '', dob: '',
                  programme: '', semester: '', regulation: '', batch: '',
                  fatherMobile: '', lab_section: '', class_section: '', residence: '',
                })
                setErrors({})
                setImages([])
                cameraRef.current?.clearImages()
              }}
            >
              <i className="fas fa-times mr-2" />
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              <i className="fas fa-save mr-2" />
              {loading ? 'Adding Student...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddStudent