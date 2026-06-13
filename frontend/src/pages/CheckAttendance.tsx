import { useState } from 'react'
import { attendanceApi } from '../services/api'
import { getApiErrorMessage } from '../services/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import type { AttendanceEntry } from '../types'

const CheckAttendance = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AttendanceEntry[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const toast = useToast()

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.warning('Please enter student ID or name')
      return
    }

    setLoading(true)
    try {
      const response = await attendanceApi.getByStudent(
        searchQuery,
        fromDate || '2020-01-01',
        toDate || new Date().toISOString().split('T')[0]
      )
      setResults(response.data)
      setHasSearched(true)
      
      if (response.data.length === 0) {
        toast.info('No attendance records found')
      } else {
        toast.success(`Found ${response.data.length} attendance records`)
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err)
      toast.error(getApiErrorMessage(err))
      setResults([])
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in-up">
      <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
        <i className="fas fa-search text-fras-gold" />
        Check Attendance
      </h1>

      <div className="bg-white rounded-lg shadow-2xl p-8">
        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Input
            label="Student ID/Name"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Reg ID or name"
          />
          <Input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end mb-6">
          <Button
            variant="primary"
            onClick={handleSearch}
            isLoading={loading}
          >
            <i className="fas fa-search" />
            Search
          </Button>
        </div>

        {/* Results Table */}
        {hasSearched && (
          <>
            {results.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-calendar-times text-6xl text-gray-300 mb-4" />
                <p className="text-gray-500">No attendance records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === 'Present'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.time || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CheckAttendance