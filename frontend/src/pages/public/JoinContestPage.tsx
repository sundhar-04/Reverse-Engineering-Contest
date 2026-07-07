import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { participantAPI, contestAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function JoinContestPage() {
  const [contests, setContests] = useState<{ id: string; name: string }[]>([])
  const [contestId, setContestId] = useState('')
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    contestAPI.getActive().then((res) => setContests(res.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contestId) { toast.error('Select a contest'); return }
    setLoading(true)
    try {
      const res = await participantAPI.join({ contest_id: contestId, name, roll_number: rollNumber, department })
      toast.success('Joined contest successfully!')
      localStorage.setItem('participant_id', res.data.participant_id)
      localStorage.setItem('contest_id', contestId)
      localStorage.setItem('participant_name', name)
      localStorage.setItem('roll_number', rollNumber)
      navigate(`/contest/${contestId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to join contest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-primary-400">&lt;/&gt; ReverseCode Arena</Link>
          <p className="text-gray-400 mt-2">Join a Contest</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-xl p-8 space-y-4 border border-surface-700">
          <div>
            <label className="block text-sm font-medium mb-1">Contest</label>
            <select
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
              required
            >
              <option value="">-- Select a contest --</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {contests.length === 0 && (
              <p className="text-xs text-yellow-400 mt-1">No active contests available right now</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Joining...' : 'Join Contest'}
          </button>
        </form>
      </div>
    </div>
  )
}
