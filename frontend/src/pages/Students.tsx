import { useState, useEffect, useRef, memo, FormEvent } from 'react'
import { studentApi } from '../services/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Camera, type CameraHandle } from '../components/Camera'

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
  image?: string
}

const Students = memo(() => {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const cameraRef = useRef<CameraHandle>(null)

  const [editForm, setEditForm] = useState({
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

  const loadStudents = async (query: string = '') => {
    setLoading(true)
    setError(null)
    try {
      //query = query.toUpperCase()
      const response = await studentApi.search(query)
      console.log('Students loaded:', response.data)
      setStudents(response.data)
    } catch (err: any) {
      setError('Failed to load students')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    loadStudents(searchQuery)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setEditForm({
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
    setIsEditModalOpen(true)
  }

  const handleDelete = (regid: string) => {
    setDeleteCandidate(regid)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteCandidate) return
    try {
      await studentApi.delete(deleteCandidate)
      setStudents(prev => prev.filter(s => s.regid !== deleteCandidate))
      setIsDeleteModalOpen(false)
      setDeleteCandidate(null)
    } catch (err: any) {
      alert('Failed to delete student: ' + err.message)
    }
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      Object.entries(editForm).forEach(([key, value]) => {
        formData.append(key === 'father_mobile' ? 'fatherMobile' : key, value)
      })
      formData.append('oldregid', editingStudent!.regid)

      await studentApi.update(formData)
      setIsEditModalOpen(false)
      loadStudents(searchQuery)
    } catch (err: any) {
      alert('Failed to update student: ' + err.message)
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

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-users text-fras-gold" />
        Students List
      </h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search student by name, regID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-fras-navy text-gold placeholder-gold/50 border-gold"
          />
        </div>
        <Button type="submit" variant="primary">
          <i className="fas fa-search" />
          Search
        </Button>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-4xl text-fras-gold" />
          <p className="text-white mt-4">Loading students...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Students Table */}
      {!loading && !error && students.length === 0 && (
        <div className="bg-white rounded-lg shadow-xl p-12 text-center">
          <i className="fas fa-users text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No students found</p>
        </div>
      )}

      {!loading && !error && students.length > 0 && (
        <div className="table-container overflow-x-auto">
          <table className="table-base min-w-[1400px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">#</th>
                <th className="table-header">Image</th>
                <th className="table-header">Name</th>
                <th className="table-header">Reg ID</th>
                <th className="table-header">Gender</th>
                <th className="table-header">Email</th>
                <th className="table-header">Mobile</th>
                <th className="table-header">DOB</th>
                <th className="table-header">Programme</th>
                <th className="table-header">Semester</th>
                <th className="table-header">Regulation</th>
                <th className="table-header">Batch</th>
                <th className="table-header">Father's Mobile</th>
                <th className="table-header">Lab Section</th>
                <th className="table-header">Class Section</th>
                <th className="table-header">Residence</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.regid} className="table-row border-b border-gray-100 hover:bg-fras-gold/10 transition-colors">
                  <td className="table-cell">{index + 1}</td>
                  <td className="table-cell">
                    {student.image ? (
                      <img
                        src={student.image}
                        alt={student.name}
                        className="w-12 h-12 object-cover rounded-lg border-2 border-fras-gold"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-user text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="table-cell font-medium">{student.name}</td>
                  <td className="table-cell">{student.regid}</td>
                  <td className="table-cell">{student.gender}</td>
                  <td className="table-cell">{student.email}</td>
                  <td className="table-cell">{student.mobile}</td>
                  <td className="table-cell">{student.dob.split('T')[0]}</td>
                  <td className="table-cell">{student.programme}</td>
                  <td className="table-cell">{student.semester}</td>
                  <td className="table-cell">{student.regulation}</td>
                  <td className="table-cell">{student.batch}</td>
                  <td className="table-cell">{student.father_mobile}</td>
                  <td className="table-cell">{student.lab_section}</td>
                  <td className="table-cell">{student.class_section}</td>
                  <td className="table-cell capitalize">{student.residence}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(student)}
                        className="w-9 h-9 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                        title="Edit"
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.regid)}
                        className="w-9 h-9 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Delete"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={
          <>
            <i className="fas fa-user-edit text-fras-gold" />
            <span>Edit Student</span>
          </>
        }
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() => {
                const form = document.getElementById('editForm') as HTMLFormElement | null
                form?.submit()
              }}
              type="button"
            >
              <i className="fas fa-save" />
              Save Changes
            </Button>
          </>
        }
      >
        <form id="editForm" onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              label="Reg ID"
              value={editForm.regid}
              onChange={(e) => setEditForm({ ...editForm, regid: e.target.value })}
              required
            />
            <select
              className="form-select"
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              required
            >
              {genderOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            <Input
              label="Mobile"
              type="tel"
              pattern="[0-9]{10}"
              value={editForm.mobile}
              onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={editForm.dob}
              onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              required
            />
            <select
              className="form-select"
              value={editForm.programme}
              onChange={(e) => setEditForm({ ...editForm, programme: e.target.value })}
              required
            >
              {programmeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={editForm.semester}
              onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
              required
            >
              {semesterOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={editForm.regulation}
              onChange={(e) => setEditForm({ ...editForm, regulation: e.target.value })}
              required
            >
              {regulationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={editForm.batch}
              onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
              required
            >
              {batchOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Input
              label="Father's Mobile"
              type="tel"
              pattern="[0-9]{10}"
              value={editForm.father_mobile}
              onChange={(e) => setEditForm({ ...editForm, father_mobile: e.target.value })}
              required
            />
            <select
              className="form-select"
              value={editForm.lab_section}
              onChange={(e) => setEditForm({ ...editForm, lab_section: e.target.value })}
              required
            >
              <option value="">Select Lab Section</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            <select
              className="form-select"
              value={editForm.class_section}
              onChange={(e) => setEditForm({ ...editForm, class_section: e.target.value })}
              required
            >
              {sectionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="form-select"
              value={editForm.residence}
              onChange={(e) => setEditForm({ ...editForm, residence: e.target.value })}
              required
            >
              {residenceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={
          <>
            <i className="fas fa-exclamation-triangle text-red-500" />
            <span>Confirm Delete</span>
          </>
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              type="button"
            >
              <i className="fas fa-trash" />
              Delete
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete student with Reg ID: <strong>{deleteCandidate}</strong>?
        </p>
      </Modal>

      {/* Hidden Camera for Edit (future use) */}
      <Camera ref={cameraRef} />
    </div>
  )
})

export default Students