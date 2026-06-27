import { useState, useEffect, useMemo, useRef } from 'react'
import { studentApi, attendanceApi } from '../services/api'
import { Button, useToast } from '../components/ui/'
import { Camera, CameraHandle } from '../components/Camera'
import {
    programmeOptions,
    batchOptions,
    sectionOptions,
    semesterOptions,
} from '../constants/options'
import type { Student } from '../types'

type MarkStatus = 1 | 0

interface RowState {
    regid: string
    status: MarkStatus
}

const TakeAttendance: React.FC = () => {
    const toast = useToast()

    const [programme, setProgramme] = useState('')
    const [batch, setBatch] = useState('')
    const [section, setSection] = useState('')
    const [semester, setSemester] = useState('')
    const [period, setPeriod] = useState<number | null>(null)

    const [students, setStudents] = useState<Student[]>([])
    const [rows, setRows] = useState<RowState[]>([])

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [isRecognizing, setIsRecognizing] = useState(false)
    const [recognizedStudents, setRecognizedStudents] = useState<Array<{regid: string; name: string; confidence: number}>>([])
    const cameraRef = useRef<CameraHandle>(null)

    const hasFilter = !!(
        programme &&
        batch &&
        section &&
        semester
    )

    useEffect(() => {
        if (!hasFilter) {
            setStudents([])
            return
        }

        let cancelled = false

        setLoading(true)

        studentApi
            .filter({
                programme,
                batch,
                section,
                semester,
            })
            .then((res) => {
                if (!cancelled) {
                    setStudents(res.data)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    toast.error('Failed to load students')
                    setStudents([])
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false)
                }
            })
        return () => {cancelled = true}
    }, [
        programme,
        batch,
        section,
        semester,
        hasFilter
    ])

    useEffect(() => {
        setRows(
            students.map((s) => ({
                regid: s.regid,
                status: 1,
            }))
        )}, [students])

    const rowMap = useMemo(() => {
        return new Map(
            rows.map((r) => [r.regid, r])
        )}, [rows])

    const presentCount = useMemo(() => rows.filter((r) => r.status === 1).length, [rows])

    const absentCount = rows.length - presentCount

    const toggleStatus = (regid: string) => {
        setRows((prev) => prev.map((r) => r.regid === regid ? {...r, status: r.status === 1 ? 0 : 1} : r))
    }

    const toggleAll = (status: MarkStatus) => {
        setRows((prev) => prev.map((r) => ({...r, status})))
    }
    
    const handleTakePhotos = () => {
        cameraRef.current?.open()
    }
    
    const handleRecognize = async () => {
        if (!hasFilter) {
            toast.warning('Please select all filter options')
            return
        }
        
        const images = cameraRef.current?.getImages()
        if (!images || images.length === 0) {
            toast.warning('Please capture at least one photo')
            return
        }
        
        setIsRecognizing(true)
        try {
            const response = await attendanceApi.recognize(
                images.map(img => img.blob),
                `${programme}-${section}`
            )
            
            setRecognizedStudents(response.data.recognized_students)
            
            // Update attendance status for recognized students
            setRows(prev => prev.map(row => {
                const recognized = response.data.recognized_students.find(s => s.regid === row.regid)
                return recognized ? { ...row, status: 1 } : row
            }))
            
            toast.success(`Recognized ${response.data.recognized_students.length} student(s)`)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Face recognition failed')
        } finally {
            setIsRecognizing(false)
        }
    }

    const handleSubmit = async () => {
        if (submitting) return
        if (!hasFilter) { toast.warning('Please select all filter options'); return }
        if (period === null) { toast.warning('Please select a period'); return }

        setSubmitting(true)

        try {
            await attendanceApi.submit({
                class: `${programme}-${section}`,
                period,
                students: rows.map((r) => ({
                    regid: r.regid,
                    status: r.status,
                })),
            })

            toast.success('Attendance submitted successfully')

            setRows((prev) => prev.map((r) => ({ ...r, status: 1 })))
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to submit attendance')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fade-in-up">
            <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
                <i className="fas fa-check-circle text-fras-gold" />
                Take Attendance
            </h1>

            <Camera ref={cameraRef} maxImages={10} />

            <div className="bg-white rounded-lg shadow-2xl p-8">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Programme
                        </label>
                        <select
                            value={programme}
                            onChange={(e) =>
                                setProgramme(e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fras-gold"
                        >
                            {programmeOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch
                        </label>
                        <select
                            value={batch}
                            onChange={(e) =>
                                setBatch(e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fras-gold"
                        >
                            {batchOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section
                        </label>
                        <select
                            value={section}
                            onChange={(e) =>
                                setSection(e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fras-gold"
                        >
                            {sectionOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                             Semester
                         </label>
                        <select
                            value={semester}
                            onChange={(e) =>
                                setSemester(e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fras-gold"
                        >
                            {semesterOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period
                    </label>

                    <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p === period ? null : p) }
                                className={`px-3 py-1 rounded-full text-sm font-medium ${period === p
                                        ? 'bg-fras-blue text-white'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}
                            > {p}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <i className="fas fa-spinner fa-spin text-4xl text-fras-gold" />
                        <p className="text-gray-600 mt-4">
                            Loading students...
                        </p>
                    </div>
                )}

                {!loading && hasFilter && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4 text-sm">
                                <span>
                                    Total: <strong>{students.length}</strong>
                                </span>
                                <span className="text-green-600">
                                    Present:{' '}
                                    <strong>{presentCount}</strong>
                                </span>
                                <span className="text-red-600">
                                    Absent:{' '}
                                    <strong>{absentCount}</strong>
                                </span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => toggleAll(1)}
                                >
                                    Mark All Present
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => toggleAll(0)}
                                >
                                    Mark All Absent
                                </Button>
                            </div>
                        </div>
                        {students.length === 0 ? (
                            <div className="text-center py-12">
                                <i className="fas fa-users text-6xl text-gray-300 mb-4" />
                                <p className="text-gray-500">
                                    No students found for selected filters
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left">
                                                ID
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                Reg ID
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                Recognition
                                            </th>
                                            <th className="px-4 py-3 text-left">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {students.map(
                                            (student, i) => {
                                                const row = rowMap.get(student.regid)

                                                const status = row?.status ?? 1

                                                const statusLabel =
                                                    status === 1
                                                        ? {
                                                            text: 'Present',
                                                            color:'bg-green-600',
                                                        }
                                                        : {
                                                            text: 'Absent',
                                                            color: 'bg-red-500',
                                                        }

                                                return (
                                                    <tr
                                                        key={student.regid}
                                                        className="hover:bg-fras-gold/10 transition-colors"
                                                    >
                                                        <td className="px-4 py-3">{i + 1}</td>
                                                        <td className="px-4 py-3 font-mono">
                                                            {student.regid}
                                                        </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {student.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {recognizedStudents.find(s => s.regid === student.regid) ? (
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-check-circle text-green-500" />
                                                            <span className="text-sm text-gray-600">
                                                                {Math.round(recognizedStudents.find(s => s.regid === student.regid)?.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <i className="fas fa-question-circle text-gray-400" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(student.regid)}
                                                        className={`px-3 py-1 rounded-full font-semibold text-white ${statusLabel.color}`}
                                                    >
                                                        {statusLabel.text}
                                                    </button>
                                                </td>
                                                    </tr>
                                                )
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {students.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-4 justify-between items-center">
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        onClick={handleTakePhotos}
                                        disabled={!hasFilter}
                                    >
                                        <i className="fas fa-camera" />
                                        Take Photos
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="text-cyan"
                                        onClick={handleRecognize}
                                        isLoading={isRecognizing}
                                        disabled={!hasFilter}
                                    >
                                        <i className="fas fa-robot" />
                                        {isRecognizing ? 'Recognizing...' : 'Recognize Faces'}
                                    </Button>
                                </div>
                                
                                <Button
                                    variant="success"
                                    onClick={handleSubmit}
                                    isLoading={submitting}
                                    disabled={
                                        submitting ||
                                        rows.length === 0
                                    }
                                >
                                    <i className="fas fa-save" />
                                    Submit Attendance
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {!loading && !hasFilter && (
                    <div className="text-center py-12 text-gray-500">
                        <i className="fas fa-arrow-up text-4xl mb-4 opacity-50" />
                        <p>
                            Select programme, batch,
                            section, and semester to load
                            students
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TakeAttendance