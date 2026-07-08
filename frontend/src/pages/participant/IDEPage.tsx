import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useEditorStore } from '../../store/editorStore'
import { executeAPI, problemAPI } from '../../services/api'
import type { RunCodeResponse, SubmitCodeResponse, Problem } from '../../types/api'
import { VERDICT_COLORS } from '../../utils/verdicts'
import toast from 'react-hot-toast'

const VERDICT_BADGE: Record<string, string> = {
  accepted: 'bg-green-500/15 text-green-400 border-green-500/30',
  wrong_answer: 'bg-red-500/15 text-red-400 border-red-500/30',
  runtime_error: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  time_limit_exceeded: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  memory_limit_exceeded: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  compile_error: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pending: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
        active
          ? 'text-primary-400 border-primary-400'
          : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500'
      }`}
    >
      {children}
    </button>
  )
}

export default function IDEPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [editorHeight, setEditorHeight] = useState(60)
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'result'>('output')
  const [submitResult, setSubmitResult] = useState<SubmitCodeResponse | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null)
  const [problemsLoading, setProblemsLoading] = useState(true)

  const problemIdFromUrl = searchParams.get('problemId') || ''

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const pct = Math.min(90, Math.max(10, (y / rect.height) * 100))
      setEditorHeight(pct)
    }
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  const {
    codes, inputs, setCurrentProblem: storeSetProblem,
    setCode, setInput, output, stderr, runtime, status,
    isRunning, isSubmitting, setRunning, setSubmitting,
    setOutput, clearOutput, resetCode,
  } = useEditorStore()

  const participantId = localStorage.getItem('participant_id') || ''
  const participantName = localStorage.getItem('participant_name') || ''
  const rollNumber = localStorage.getItem('roll_number') || ''

  // Load problems list
  useEffect(() => {
    const loadProblems = async () => {
      try {
        const res = await problemAPI.list(contestId!)
        setProblems(res.data)
        setProblemsLoading(false)
      } catch {
        setProblemsLoading(false)
      }
    }
    loadProblems()
  }, [contestId])

  // Set current problem from URL
  useEffect(() => {
    if (problems.length === 0) return
    const pid = problemIdFromUrl || problems[0].id
    const found = problems.find((p) => p.id === pid) || problems[0]
    setCurrentProblem(found)
    storeSetProblem(found.id)
    if (!searchParams.get('problemId')) {
      setSearchParams({ problemId: found.id }, { replace: true })
    }
  }, [problems, problemIdFromUrl])

  const handleProblemChange = (problemId: string) => {
    setSearchParams({ problemId }, { replace: true })
    const found = problems.find((p) => p.id === problemId)
    if (found) {
      setCurrentProblem(found)
      storeSetProblem(found.id)
    }
    clearOutput()
    setSubmitResult(null)
    setActiveTab('output')
  }

  const handleRun = async () => {
    const code = currentProblem ? (codes[currentProblem.id] || '') : ''
    if (!code.trim()) { toast.error('No code to run'); return }
    setRunning(true)
    clearOutput()
    setActiveTab('output')

    try {
      const pid = currentProblem?.id || problemIdFromUrl
      const res = await executeAPI.run({
        code,
        input: currentProblem ? (inputs[currentProblem.id] || '') : '',
        participant_id: participantId,
        problem_id: pid,
      })
      const data: RunCodeResponse = res.data
      setOutput(data.stdout, data.stderr, data.runtime_ms, data.status)
    } catch (err: any) {
      setOutput('', err.response?.data?.detail || 'Execution failed', null, 'error')
      toast.error('Execution failed')
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    const code = currentProblem ? (codes[currentProblem.id] || '') : ''
    if (!code.trim()) { toast.error('No code to submit'); return }
    setSubmitting(true)
    clearOutput()
    setSubmitResult(null)

    try {
      const pid = currentProblem?.id || problemIdFromUrl
      const res = await executeAPI.submit({
        code,
        participant_id: participantId,
        problem_id: pid,
      })
      const data: SubmitCodeResponse = res.data
      setSubmitResult(data)
      setActiveTab('result')

      if (data.verdict === 'accepted') {
        toast.success('All test cases passed!')
      } else {
        toast.error(`Failed: ${data.verdict.replace(/_/g, ' ')}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handleSubmit()
      } else {
        handleRun()
      }
    }
  }

  const editorValue = currentProblem ? (codes[currentProblem.id] || '') : ''
  const editorInput = currentProblem ? (inputs[currentProblem.id] || '') : ''

  return (
    <div className="h-screen flex flex-col bg-surface-900" onKeyDown={handleKeyDown}>
      <header className="border-b border-surface-700 bg-surface-900/80 backdrop-blur-sm shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link to={`/contest/${contestId}`} className="text-sm text-gray-400 hover:text-primary-400 transition shrink-0">
              &larr; Dashboard
            </Link>
            <div className="h-4 w-px bg-surface-600 shrink-0" />
            <span className="text-xs font-mono text-primary-400 font-bold shrink-0">&lt;/&gt;</span>

            {!problemsLoading && problems.length > 1 && (
              <select
                value={currentProblem?.id || ''}
                onChange={(e) => handleProblemChange(e.target.value)}
                className="text-sm bg-surface-800 border border-surface-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500 transition max-w-[200px]"
              >
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.score} pts)</option>
                ))}
              </select>
            )}

            {currentProblem && (
              <>
                <span className="text-sm font-medium text-gray-300 truncate">{currentProblem.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">{currentProblem.score} pts</span>
              </>
            )}
            <div className="h-4 w-px bg-surface-600 shrink-0" />
            <span className="text-xs text-gray-500 truncate">{participantName}</span>
            <span className="text-xs text-gray-600">({rollNumber})</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to={`/contest/${contestId}/leaderboard`} className="text-xs text-gray-400 hover:text-primary-400 transition">
              Leaderboard
            </Link>
            <Link to={`/contest/${contestId}/submissions`} className="text-xs text-gray-400 hover:text-primary-400 transition">
              Submissions
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 p-3 gap-3">
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0 border border-surface-700/60 rounded-lg overflow-hidden">
          <div style={{ height: `${editorHeight}%`, minHeight: 0 }} className="overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={editorValue}
              onChange={(val) => currentProblem && setCode(currentProblem.id, val || '')}
              onMount={(editor) => { editorRef.current = editor }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          <div
            className="h-2 shrink-0 flex items-center justify-center cursor-row-resize bg-surface-800/50 hover:bg-primary-500/20 transition group"
            onMouseDown={handleDragStart}
          >
            <div className="w-8 h-0.5 rounded-full bg-surface-600 group-hover:bg-primary-400 transition" />
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-t border-surface-700/60 bg-surface-850">
            <div className="flex items-center border-b border-surface-700 bg-surface-900/50 shrink-0">
              <TabButton active={activeTab === 'output'} onClick={() => { clearOutput(); setSubmitResult(null); setActiveTab('output') }}>
                Output
              </TabButton>
              <TabButton active={activeTab === 'input'} onClick={() => setActiveTab('input')}>
                Custom Input
              </TabButton>
              {submitResult && (
                <TabButton active={activeTab === 'result'} onClick={() => setActiveTab('result')}>
                  Submit Result
                </TabButton>
              )}
              <div className="flex-1" />
              {(activeTab === 'output' && (output || stderr)) && (
                <button onClick={clearOutput} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition mr-2">
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 bg-surface-800/80 overflow-auto min-h-0" tabIndex={-1}>
              {activeTab === 'input' ? (
                <textarea
                  value={editorInput}
                  onChange={(e) => currentProblem && setInput(currentProblem.id, e.target.value)}
                  className="w-full h-full bg-transparent resize-none focus:outline-none p-4 font-mono text-sm text-gray-200 placeholder-gray-600"
                  placeholder="Enter custom input here..."
                  spellCheck={false}
                />
              ) : activeTab === 'result' && submitResult ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full border ${VERDICT_BADGE[submitResult.verdict] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                      {submitResult.verdict.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-400">
                      {submitResult.passed_test_cases}/{submitResult.total_test_cases} test cases passed
                    </span>
                    {submitResult.execution_time > 0 && (
                      <span className="text-xs text-gray-500">{submitResult.execution_time}ms</span>
                    )}
                  </div>

                  <div className="h-px bg-surface-700" />

                  {submitResult.failed_test_case ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-surface-900 rounded-lg p-3 border border-surface-700">
                        <p className="text-xs text-gray-500 font-medium mb-1.5">Input #{submitResult.failed_test_case.test_order + 1}</p>
                        <pre className="text-sm text-gray-200 font-mono whitespace-pre-wrap">{submitResult.failed_test_case.input}</pre>
                      </div>
                      <div className="bg-surface-900 rounded-lg p-3 border border-green-500/20">
                        <p className="text-xs text-green-400 font-medium mb-1.5">Expected</p>
                        <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">{submitResult.failed_test_case.expected_output}</pre>
                      </div>
                      <div className="bg-surface-900 rounded-lg p-3 border border-red-500/20">
                        <p className="text-xs text-red-400 font-medium mb-1.5">Got</p>
                        <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap">{submitResult.failed_test_case.actual_output}</pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      All test cases passed
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 font-mono text-sm space-y-1.5">
                  {output && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-sans mb-1">stdout</p>
                      <pre className="text-gray-200 whitespace-pre-wrap">{output}</pre>
                    </div>
                  )}
                  {stderr && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-red-400 font-sans mb-1">stderr</p>
                      <pre className="text-red-300 whitespace-pre-wrap">{stderr}</pre>
                    </div>
                  )}
                  {runtime !== null && (
                    <p className="text-xs text-gray-500 pt-1">Runtime: {runtime}ms | Status: {status}</p>
                  )}
                  {!output && !stderr && (
                    <p className="text-gray-500 italic">Run your code to see output here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-700 bg-surface-850 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={clearOutput}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-gray-200 transition"
          >
            Clear Output
          </button>
          <button
            onClick={() => currentProblem && resetCode(currentProblem.id)}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-400 hover:text-gray-200 transition"
          >
            Reset Code
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 hidden sm:block">
            <kbd className="px-1 py-0.5 rounded bg-surface-700 text-gray-400 font-mono text-[10px]">Ctrl</kbd>
            <span className="mx-0.5">+</span>
            <kbd className="px-1 py-0.5 rounded bg-surface-700 text-gray-400 font-mono text-[10px]">Enter</kbd>
            <span className="mx-1.5">Run</span>
            <span className="mx-1 text-gray-700">|</span>
            <kbd className="px-1 py-0.5 rounded bg-surface-700 text-gray-400 font-mono text-[10px]">Ctrl</kbd>
            <span className="mx-0.5">+</span>
            <kbd className="px-1 py-0.5 rounded bg-surface-700 text-gray-400 font-mono text-[10px]">Shift</kbd>
            <span className="mx-0.5">+</span>
            <kbd className="px-1 py-0.5 rounded bg-surface-700 text-gray-400 font-mono text-[10px]">Enter</kbd>
            <span className="mx-1.5">Submit</span>
          </span>
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="px-5 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-500 transition disabled:opacity-50 font-medium shadow-sm flex items-center gap-2"
          >
            {(isRunning) && <Spinner />}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            className="px-5 py-1.5 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium shadow-sm flex items-center gap-2"
          >
            {isSubmitting && <Spinner />}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            {isSubmitting ? 'Judging...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
