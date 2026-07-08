import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { contestAPI, adminAPI, testcaseAPI, problemAPI } from '../../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import type { Problem } from '../../types/api'

function AddProblemModal({
  open,
  onClose,
  onSave,
  contestId,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSave: () => void
  contestId: string
  initial?: Problem | null
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [score, setScore] = useState(initial?.score || 100)
  const [executableFile, setExecutableFile] = useState<File | null>(null)
  const [testcaseFile, setTestcaseFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '')
      setDescription(initial?.description || '')
      setScore(initial?.score || 100)
      setExecutableFile(null)
      setTestcaseFile(null)
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      let problemId: string
      if (initial) {
        await problemAPI.update(initial.id, { title, description, score })
        problemId = initial.id
      } else {
        const res = await problemAPI.create({ contest_id: contestId, title, description, score })
        problemId = res.data.id
      }
      if (executableFile) {
        await problemAPI.uploadExecutable(problemId, executableFile)
      }
      if (testcaseFile) {
        await testcaseAPI.uploadBulk(problemId, testcaseFile)
      }
      toast.success(initial ? 'Problem updated' : 'Problem added')
      onSave()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save problem')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-5">{initial ? 'Edit Problem' : 'Add Problem'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition" placeholder="e.g. Challenge 1: Fibonacci" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Score</label>
            <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} min={1} className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Executable (.exe / .out / .bin)</label>
            <input type="file" accept=".exe,.out,.bin" onChange={(e) => setExecutableFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-surface-700 file:text-gray-200 hover:file:bg-surface-600 cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Test Cases (.csv / .json)</label>
            <p className="text-xs text-gray-500 mb-1">CSV: input,expected_output,test_order,is_sample</p>
            <input type="file" accept=".csv,.json" onChange={(e) => setTestcaseFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-surface-700 file:text-gray-200 hover:file:bg-surface-600 cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-surface-700 hover:bg-surface-600 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50">
            {saving ? 'Saving...' : initial ? 'Update' : 'Add Problem'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({
  open,
  problem,
  onClose,
  onConfirm,
}: {
  open: boolean
  problem: Problem | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!open || !problem) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-800 rounded-xl border border-surface-700 shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2">Delete Problem</h2>
        <p className="text-sm text-gray-400 mb-4">
          Are you sure you want to delete <strong className="text-gray-200">{problem.title}</strong>? This will also permanently delete:
        </p>
        <ul className="text-sm text-gray-400 space-y-1 mb-5 list-disc list-inside">
          <li>All test cases for this problem</li>
          <li>All participant submissions for this problem</li>
          <li>The uploaded executable file</li>
        </ul>
        <p className="text-xs text-red-400 mb-5">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-surface-700 hover:bg-surface-600 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 transition">Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function ContestDetailPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [contest, setContest] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editProblem, setEditProblem] = useState<Problem | null>(null)
  const [deleteProblem, setDeleteProblem] = useState<Problem | null>(null)
  const [execUploads, setExecUploads] = useState<Record<string, File | null>>({})
  const [tcUploads, setTcUploads] = useState<Record<string, File | null>>({})

  useEffect(() => {
    loadData()
  }, [contestId])

  const loadData = async () => {
    try {
      const [contestRes, statsRes, problemsRes] = await Promise.all([
        contestAPI.get(contestId!),
        adminAPI.getStats(contestId!),
        problemAPI.list(contestId!),
      ])
      setContest(contestRes.data)
      setStats(statsRes.data)
      setProblems(problemsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    await contestAPI.start(contestId!)
    toast.success('Contest started!')
    loadData()
  }

  const handleEnd = async () => {
    await contestAPI.end(contestId!)
    toast.success('Contest ended')
    loadData()
  }

  const handleUploadExec = async (problemId: string) => {
    const file = execUploads[problemId]
    if (!file) return
    await problemAPI.uploadExecutable(problemId, file)
    toast.success('Executable uploaded')
    setExecUploads((prev) => ({ ...prev, [problemId]: null }))
    loadData()
  }

  const handleUploadTC = async (problemId: string) => {
    const file = tcUploads[problemId]
    if (!file) return
    await testcaseAPI.uploadBulk(problemId, file)
    toast.success('Test cases uploaded')
    setTcUploads((prev) => ({ ...prev, [problemId]: null }))
    loadData()
  }

  const handleDeleteProblem = async () => {
    if (!deleteProblem) return
    try {
      await problemAPI.delete(deleteProblem.id)
      toast.success('Problem deleted')
      setDeleteProblem(null)
      loadData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete problem')
    }
  }

  if (loading) return <LoadingSkeleton variant="card" count={4} />

  if (!contest) return null

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={contest.name}
        backLink="/admin"
        rightSlot={
          <div className="flex items-center gap-3">
            <StatusBadge status={contest.status} />
            {contest.status === 'draft' && (
              <button onClick={handleStart} className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-500 transition shadow-sm">
                Start Contest
              </button>
            )}
            {contest.status === 'running' && (
              <button onClick={handleEnd} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 transition shadow-sm">
                End Contest
              </button>
            )}
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
              <p className="text-2xl font-bold text-blue-400">{stats.total_participants}</p>
              <p className="text-sm text-gray-400 mt-1">Participants</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
              <p className="text-2xl font-bold text-yellow-400">{stats.total_submissions}</p>
              <p className="text-sm text-gray-400 mt-1">Submissions</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
              <p className="text-2xl font-bold text-green-400">{stats.accepted_submissions}</p>
              <p className="text-sm text-gray-400 mt-1">Accepted</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
              <p className="text-2xl font-bold text-purple-400">{stats.total_testcases}</p>
              <p className="text-sm text-gray-400 mt-1">Test Cases</p>
            </div>
          </div>
        )}

        {/* Problems Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Problems ({problems.length})</h2>
            <button onClick={() => { setEditProblem(null); setAddOpen(true) }} className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition shadow-sm">
              + Add Problem
            </button>
          </div>

          {problems.length === 0 ? (
            <div className="bg-surface-800/60 rounded-xl border border-surface-700/60 border-dashed p-8 text-center">
              <p className="text-gray-400">No problems yet. Add a problem to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {problems.map((p) => (
                <div key={p.id} className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">{p.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">{p.score} pts</span>
                        {p.executable_name && <span className="text-xs text-gray-500">Exec: {p.executable_name}</span>}
                      </div>
                      {p.description && <p className="text-sm text-gray-400 mt-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setEditProblem(p); setAddOpen(true) }} className="px-3 py-1.5 text-xs rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-300 transition">Edit</button>
                      <button onClick={() => setDeleteProblem(p)} className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition">Delete</button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-surface-700">
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".exe,.out,.bin" onChange={(e) => setExecUploads((prev) => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} className="w-32 text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-surface-700 file:text-gray-300 hover:file:bg-surface-600 cursor-pointer" />
                      <button onClick={() => handleUploadExec(p.id)} disabled={!execUploads[p.id]} className="px-3 py-1 text-xs rounded bg-primary-600/80 hover:bg-primary-500 transition disabled:opacity-50">Upload Exec</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="file" accept=".csv,.json" onChange={(e) => setTcUploads((prev) => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} className="w-32 text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-surface-700 file:text-gray-300 hover:file:bg-surface-600 cursor-pointer" />
                      <button onClick={() => handleUploadTC(p.id)} disabled={!tcUploads[p.id]} className="px-3 py-1 text-xs rounded bg-primary-600/80 hover:bg-primary-500 transition disabled:opacity-50">Upload TCs</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to={`/admin/contests/${contestId}/participants`} className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm hover:border-primary-500 hover:shadow-primary-500/5 transition text-center group">
            <p className="text-lg font-bold group-hover:text-primary-400 transition">{stats?.total_participants || 0}</p>
            <p className="text-sm text-gray-400 mt-1">View Participants</p>
          </Link>
          <Link to={`/admin/contests/${contestId}/submissions`} className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm hover:border-primary-500 hover:shadow-primary-500/5 transition text-center group">
            <p className="text-lg font-bold group-hover:text-primary-400 transition">{stats?.total_submissions || 0}</p>
            <p className="text-sm text-gray-400 mt-1">View Submissions</p>
          </Link>
          <Link to={`/admin/contests/${contestId}/leaderboard`} className="bg-surface-800 rounded-xl p-5 border border-surface-700 shadow-sm hover:border-primary-500 hover:shadow-primary-500/5 transition text-center group">
            <p className="text-lg font-bold group-hover:text-primary-400 transition">{stats?.total_participants || 0}</p>
            <p className="text-sm text-gray-400 mt-1">View Leaderboard</p>
          </Link>
        </div>
      </main>

      <AddProblemModal open={addOpen} onClose={() => setAddOpen(false)} onSave={loadData} contestId={contestId!} initial={editProblem} />
      <DeleteConfirmModal open={!!deleteProblem} problem={deleteProblem} onClose={() => setDeleteProblem(null)} onConfirm={handleDeleteProblem} />
    </div>
  )
}
