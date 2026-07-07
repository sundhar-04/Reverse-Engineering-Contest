import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { contestAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateContestPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [executable, setExecutable] = useState<File | null>(null)

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

      if (executable) {
        await contestAPI.uploadExecutable(contestId, executable)
      }

      toast.success('Contest created successfully')
      navigate(`/admin/contests/${contestId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create contest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-primary-400 hover:text-primary-300">&larr; Dashboard</Link>
          <h1 className="text-xl font-bold">Create Contest</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-xl p-8 border border-surface-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contest Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Executable (.exe)</label>
            <input
              type="file"
              accept=".exe,.out,.bin"
              onChange={(e) => setExecutable(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-700 file:text-gray-200 hover:file:bg-surface-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Creating...' : 'Create Contest'}
          </button>
        </form>
      </main>
    </div>
  )
}
