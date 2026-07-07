import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

export default function AdminContests() {
  const [contests, setContests] = useState<any[]>([])

  useEffect(() => {
    adminAPI.listContests().then((res) => setContests(res.data))
  }, [])

  return (
    <div className="min-h-screen bg-surface-900">
      <header className="border-b border-surface-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/admin" className="text-primary-400 hover:text-primary-300">&larr; Dashboard</Link>
          <h1 className="text-xl font-bold">All Contests</h1>
          <Link to="/admin/contests/create" className="ml-auto px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition">
            Create Contest
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-3">
          {contests.map((c: any) => (
            <Link key={c.id} to={`/admin/contests/${c.id}`} className="block bg-surface-800 rounded-xl p-4 border border-surface-700 hover:border-primary-500 transition">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-gray-400">{c.participant_count} participants · {c.submission_count} submissions</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    c.status === 'running' ? 'text-green-400 bg-green-400/10' :
                    c.status === 'ended' ? 'text-gray-400 bg-gray-400/10' : 'text-yellow-400 bg-yellow-400/10'
                  }`}>{c.status.toUpperCase()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
