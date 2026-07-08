import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contestAPI } from '../../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'

export default function CreateContestPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await contestAPI.create({
        name,
        description,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        settings: {
          max_participants: 100,
          max_submissions: 100,
          time_limit_per_test: 2,
          memory_limit: 256,
        },
      })
      const contestId = res.data.id

      toast.success('Contest created successfully')
      navigate(`/admin/contests/${contestId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create contest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Create Contest"
        backLink="/admin"
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-xl p-8 border border-surface-700 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Contest Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium shadow-sm flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Contest'}
          </button>
        </form>
      </main>
    </div>
  )
}
