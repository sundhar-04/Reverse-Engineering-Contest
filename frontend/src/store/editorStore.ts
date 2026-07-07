import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EditorState {
  code: string
  input: string
  output: string
  stderr: string
  runtime: number | null
  status: string | null
  isRunning: boolean
  isSubmitting: boolean
  setCode: (code: string) => void
  setInput: (input: string) => void
  setOutput: (output: string, stderr: string, runtime: number | null, status: string | null) => void
  setRunning: (v: boolean) => void
  setSubmitting: (v: boolean) => void
  clearOutput: () => void
  resetCode: () => void
}

const DEFAULT_CODE = `# Write your reverse engineered Python solution here
# Analyze the executable and implement the equivalent algorithm

def solve():
    # Read input
    data = input().strip()
    # TODO: Implement your solution
    
    
    # Print output
    print(result)

if __name__ == "__main__":
    solve()
`

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      code: DEFAULT_CODE,
      input: '',
      output: '',
      stderr: '',
      runtime: null,
      status: null,
      isRunning: false,
      isSubmitting: false,
      setCode: (code) => set({ code }),
      setInput: (input) => set({ input }),
      setOutput: (output, stderr, runtime, status) => set({ output, stderr, runtime, status }),
      setRunning: (v) => set({ isRunning: v }),
      setSubmitting: (v) => set({ isSubmitting: v }),
      clearOutput: () => set({ output: '', stderr: '', runtime: null, status: null }),
      resetCode: () => set({ code: DEFAULT_CODE }),
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({ code: state.code, input: state.input }),
    }
  )
)
