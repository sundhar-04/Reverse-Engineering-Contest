import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EditorState {
  codes: Record<string, string>
  inputs: Record<string, string>
  currentProblemId: string | null
  output: string
  stderr: string
  runtime: number | null
  status: string | null
  isRunning: boolean
  isSubmitting: boolean
  setCurrentProblem: (problemId: string) => void
  setCode: (problemId: string, code: string) => void
  setInput: (problemId: string, input: string) => void
  setOutput: (output: string, stderr: string, runtime: number | null, status: string | null) => void
  setRunning: (v: boolean) => void
  setSubmitting: (v: boolean) => void
  clearOutput: () => void
  resetCode: (problemId: string) => void
}

const DEFAULT_CODE = `# Reverse Engineering Challenge
#
# INSTRUCTIONS:
# 1. Download the executable from the contest dashboard
# 2. Run it locally on your machine with various inputs
# 3. Observe the behavior and reverse-engineer the algorithm
# 4. Write equivalent Python code below
#
# The judge will test your code against hidden test cases.
# Use the "Run" button (Ctrl+Enter) to test with custom input.
# Use the "Submit" button (Ctrl+Shift+Enter) to submit for judging.

def solve():
    data = input().strip()
    # TODO: Implement the reverse-engineered logic here
    
    
    # Print output
    print(result)

if __name__ == "__main__":
    solve()
`

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      codes: {},
      inputs: {},
      currentProblemId: null,
      output: '',
      stderr: '',
      runtime: null,
      status: null,
      isRunning: false,
      isSubmitting: false,
      setCurrentProblem: (problemId) => set({ currentProblemId: problemId }),
      setCode: (problemId, code) => set((state) => ({
        codes: { ...state.codes, [problemId]: code }
      })),
      setInput: (problemId, input) => set((state) => ({
        inputs: { ...state.inputs, [problemId]: input }
      })),
      setOutput: (output, stderr, runtime, status) => set({ output, stderr, runtime, status }),
      setRunning: (v) => set({ isRunning: v }),
      setSubmitting: (v) => set({ isSubmitting: v }),
      clearOutput: () => set({ output: '', stderr: '', runtime: null, status: null }),
      resetCode: (problemId) => set((state) => ({
        codes: { ...state.codes, [problemId]: DEFAULT_CODE }
      })),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({ codes: state.codes, inputs: state.inputs }),
    }
  )
)
