import { useState, useRef, useEffect } from 'react'
import { studentApi, attendanceApi } from '../services/api'
import { Button } from '../components/ui/Button'
import { Camera, type CameraHandle, type CapturedImage } from '../components/Camera'

interface Student {
  id: number
  name: string
  regid: string
  class_section?: string
}

interface AttendanceRecord {
  regid: string
  status: 'pending' | 'present' | 'absent'
  matchedImage?: string
}

const TakeAttendance: React.FC = () => {
  const cameraRef = useRef<CameraHandle>(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<CapturedImage[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (selectedClass) {
      loadStudentsForClass()
    }
  }, [selectedClass])

  const loadStudentsForClass = async () => {
    setLoading(true)
    try {
      // Load all students - in production, filter by class_section
      const response = await studentApi.search('')
      const filtered = response.data.filter(
        (s: Student) => s.class_section === selectedClass || selectedClass === ''
      )
      setStudents(filtered)
      setAttendanceRecords(
        filtered.map((s: Student) => ({
          regid: s.regid,
          status: 'pending',
        }))
      )
    } catch (err: any) {
      console.error('Error loading students:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImagesChange = (newImages: CapturedImage[]) => {
    setImages(newImages)
    // TODO: Implement face recognition matching here
    // For now, this is a placeholder for future face recognition logic
  }

  const markPresent = (regid: string, matchedImage?: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.regid === regid
          ? { ...record, status: 'present', matchedImage }
          : record
      )
    )
  }

  const handleSubmitAttendance = async () => {
    if (!selectedClass || !selectedDate) {
      alert('Please select class and date')
      return
    }

    const presentStudents = attendanceRecords.filter(r => r.status === 'present')
    if (presentStudents.length === 0) {
      alert('Please mark at least one student as present')
      return
    }

    setSubmitting(true)
    try {
      await attendanceApi.submit({
        class: selectedClass,
        date: selectedDate,
        students: presentStudents,
      })
      alert('Attendance submitted successfully!')
      // Reset
      setAttendanceRecords([])
      setImages([])
      cameraRef.current?.clearImages()
    } catch (err: any) {
      alert('Failed to submit attendance: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const classOptions = [
    { value: '', label: 'Select Class' },
    { value: 'A', label: 'Class A' },
    { value: 'B', label: 'Class B' },
    { value: 'C', label: 'Class C' },
    { value: 'D', label: 'Class D' },
    { value: 'E', label: 'Class E' },
    { value: 'F', label: 'Class F' },
    { value: 'G', label: 'Class G' },
    { value: 'H', label: 'Class H' },
    { value: 'I', label: 'Class I' },
  ]

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-check-circle text-fras-gold" />
        Take Attendance
      </h1>

      <div className="bg-white rounded-lg shadow-2xl p-8">
        {/* Class and Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="form-select"
            >
              {classOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Camera Section */}
        <div className="mb-6">
          <Button
            type="button"
            variant="primary"
            onClick={() => cameraRef.current?.open()}
          >
            <i className="fas fa-camera" />
            Open Camera for Face Recognition
          </Button>
          <Camera ref={cameraRef} onImagesChange={handleImagesChange} />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-4xl text-fras-gold" />
            <p className="text-gray-600 mt-4">Loading students...</p>
          </div>
        )}

        {/* Attendance Table */}
        {selectedClass && !loading && students.length > 0 && (
          <div className="table-container overflow-x-auto">
            <table className="table-base min-w-[800px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="table-header">Reg ID</th>
                  <th className="table-header">Student Name</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => {
                  const student = students.find(s => s.regid === record.regid)
                  return (
                    <tr key={record.regid} className="border-b border-gray-100 hover:bg-fras-gold/10">
                      <td className="table-cell">{record.regid}</td>
                      <td className="table-cell font-medium">{student?.name || 'N/A'}</td>
                      <td className="table-cell">
                        {record.status === 'pending' && (
                          <span className="text-orange-500 font-semibold">Pending</span>
                        )}
                        {record.status === 'present' && (
                          <span className="text-green-500 font-semibold">Present</span>
                        )}
                        {record.status === 'absent' && (
                          <span className="text-red-500 font-semibold">Absent</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {record.status === 'pending' ? (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => markPresent(record.regid)}
                          >
                            <i className="fas fa-check" />
                            Present
                          </Button>
                        ) : (
                          <i className="fas fa-check-circle text-green-500 text-xl" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Submit Button */}
        {attendanceRecords.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              variant="success"
              onClick={handleSubmitAttendance}
              isLoading={submitting}
              disabled={attendanceRecords.filter(r => r.status === 'present').length === 0}
            >
              <i className="fas fa-save" />
              Submit Attendance
            </Button>
          </div>
        )}

        {/* Empty State */}
        {selectedClass && !loading && students.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-users text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500">No students found for this class</p>
          </div>
        )}

        {!selectedClass && (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-arrow-up text-4xl mb-4 opacity-50" />
            <p>Select a class to begin taking attendance</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TakeAttendance