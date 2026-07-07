import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

export default function AdminParticipants() {
  const { contestId } = useParams<{ contestId: string }>()
  const [participants, setParticipants] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminAPI.getParticipants(contestId!).then((res) => setParticipants(res.data))
  }, [contestId])

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={`/admin/contests/${contestId}`} className="text-primary-400 hover:text-primary-300">&larr; Contest</Link>
          <h1 className="text-xl font-bold">Participants</h1>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none"
          />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-surface-700/50 text-sm font-medium text-gray-400">
            <div>Name</div>
            <div>Roll Number</div>
            <div>Department</div>
            <div>Joined</div>
          </div>
          {filtered.map((p) => (
            <div key={p.id} className="grid grid-cols-4 gap-4 px-6 py-3 border-t border-surface-700 text-sm">
              <div className="font-medium">{p.name}</div>
              <div className="text-gray-400">{p.roll_number}</div>
              <div className="text-gray-400">{p.department}</div>
              <div className="text-gray-500">{new Date(p.joined_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
