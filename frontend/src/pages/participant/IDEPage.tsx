import { useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useEditorStore } from '../../store/editorStore'
import { executeAPI, problemAPI } from '../../services/api'
import type { RunCodeResponse, SubmitCodeResponse } from '../../types/api'
import toast from 'react-hot-toast'

const VERDICT_COLORS: Record<string, string> = {
  accepted: 'text-green-400',
  wrong_answer: 'text-red-400',
  runtime_error: 'text-yellow-400',
  time_limit_exceeded: 'text-orange-400',
  memory_limit_exceeded: 'text-orange-400',
  compile_error: 'text-yellow-400',
  pending: 'text-gray-400',
  running: 'text-blue-400',
}

export default function IDEPage() {
  const { contestId } = useParams<{ contestId: string }>()
  const editorRef = useRef<any>(null)
  const [activeTab, setActiveTab] = useState<'output' | 'input'>('output')
  const [submitResult, setSubmitResult] = useState<SubmitCodeResponse | null>(null)
  const [showSubmitResult, setShowSubmitResult] = useState(false)

  const {
    code, setCode, input, setInput, output, stderr, runtime, status,
    isRunning, isSubmitting, setRunning, setSubmitting,
    setOutput, clearOutput, resetCode,
  } = useEditorStore()

  const participantId = localStorage.getItem('participant_id') || ''
  const participantName = localStorage.getItem('participant_name') || ''
  const rollNumber = localStorage.getItem('roll_number') || ''
  const problemId = localStorage.getItem('problem_id') || ''

  const getProblemId = useCallback(async () => {
    if (problemId) return problemId
    try {
      const res = await problemAPI.list(contestId!)
      const pid = res.data[0]?.id
      if (pid) {
        localStorage.setItem('problem_id', pid)
        return pid
      }
    } catch {}
    return ''
  }, [contestId, problemId])

  const handleRun = async () => {
    if (!code.trim()) { toast.error('No code to run'); return }
    setRunning(true)
    clearOutput()
    setShowSubmitResult(false)
    setActiveTab('output')

    try {
      const pid = await getProblemId()
      const res = await executeAPI.run({
        code,
        input,
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
    if (!code.trim()) { toast.error('No code to submit'); return }
    setSubmitting(true)
    clearOutput()
    setShowSubmitResult(false)

    try {
      const pid = await getProblemId()
      const res = await executeAPI.submit({
        code,
        participant_id: participantId,
        problem_id: pid,
      })
      const data: SubmitCodeResponse = res.data
      setSubmitResult(data)
      setShowSubmitResult(true)
      setActiveTab('output')

      if (data.verdict === 'accepted') {
        toast.success('All test cases passed! 🎉')
      } else {
        toast.error(`Failed: ${data.verdict.replace(/_/g, ' ')}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface-900">
      <header className="border-b border-surface-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to={`/contest/${contestId}`} className="text-primary-400 hover:text-primary-300">
            &larr; Dashboard
          </Link>
          <span className="text-sm font-bold text-gray-300">ReverseCode Arena</span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-sm text-gray-400">{participantName} ({rollNumber})</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/contest/${contestId}/leaderboard`} className="text-xs text-gray-400 hover:text-primary-400">
            Leaderboard
          </Link>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
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
              }}
            />
          </div>

          <div className="border-t border-surface-700">
            <div className="flex border-b border-surface-700">
              <button
                onClick={() => setActiveTab('output')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'output' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Output
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'input' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Custom Input
              </button>
            </div>

            <div className="h-48 bg-surface-800 p-4 overflow-auto font-mono text-sm">
              {activeTab === 'input' ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-full bg-transparent resize-none focus:outline-none"
                  placeholder="Enter custom input here..."
                />
              ) : showSubmitResult && submitResult ? (
                <div className="space-y-3">
                  <div className={`text-lg font-bold ${VERDICT_COLORS[submitResult.verdict] || 'text-gray-400'}`}>
                    {submitResult.verdict.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <p className="text-sm text-gray-400">
                    Passed: {submitResult.passed_test_cases}/{submitResult.total_test_cases} test cases
                  </p>
                  {submitResult.execution_time > 0 && (
                    <p className="text-xs text-gray-500">Runtime: {submitResult.execution_time}ms</p>
                  )}
                  {submitResult.failed_test_case && (
                    <div className="mt-3 p-3 bg-surface-900 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-red-400">Failed Test Case #{submitResult.failed_test_case.test_order + 1}</p>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Input:</p>
                        <pre className="text-sm bg-surface-800 p-2 rounded">{submitResult.failed_test_case.input}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Expected Output:</p>
                        <pre className="text-sm bg-surface-800 p-2 rounded text-green-400">{submitResult.failed_test_case.expected_output}</pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Your Output:</p>
                        <pre className="text-sm bg-surface-800 p-2 rounded text-red-400">{submitResult.failed_test_case.actual_output}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                  {stderr && <pre className="text-red-400 whitespace-pre-wrap">{stderr}</pre>}
                  {runtime !== null && (
                    <p className="text-xs text-gray-500">Runtime: {runtime}ms | Status: {status}</p>
                  )}
                  {!output && !stderr && <p className="text-gray-500">Run your code to see output here</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-700 px-4 py-2 flex items-center justify-between shrink-0 bg-surface-800">
        <div className="flex gap-2">
          <button
            onClick={clearOutput}
            className="px-3 py-1.5 text-xs rounded bg-surface-700 hover:bg-surface-600 transition"
          >
            Clear Output
          </button>
          <button
            onClick={resetCode}
            className="px-3 py-1.5 text-xs rounded bg-surface-700 hover:bg-surface-600 transition"
          >
            Reset Code
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="px-5 py-1.5 text-sm rounded bg-green-600 hover:bg-green-500 transition disabled:opacity-50 font-medium"
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting}
            className="px-5 py-1.5 text-sm rounded bg-primary-600 hover:bg-primary-500 transition disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Judging...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
