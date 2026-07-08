export interface Contest {
  id: string
  name: string
  description: string
  start_time: string
  end_time: string
  settings: {
    max_participants: number
    max_submissions: number
    time_limit_per_test: number
    memory_limit: number
  }
  status: 'draft' | 'running' | 'ended' | 'archived'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ContestStatus {
  contest_id: string
  status: string
  start_time: string
  end_time: string
  is_active: boolean
  time_remaining: number | null
}

export interface Participant {
  id: string
  name: string
  roll_number: string
  department: string
  contest_id: string
  joined_at: string
  is_active: boolean
}

export interface Problem {
  id: string
  contest_id: string
  title: string
  description: string
  score: number
  time_limit: number
  memory_limit: number
  executable_name: string | null
  executable_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  participant_id: string
  problem_id: string
  contest_id: string
  code: string
  language: string
  custom_input: string
  custom_output: string | null
  custom_error: string | null
  custom_runtime: number | null
  custom_status: string | null
  custom_memory: number | null
  verdict: string
  failed_test_case: {
    test_case_id: string | null
    input: string
    expected_output: string
    actual_output: string
    test_order: number
  } | null
  passed_test_cases: number
  total_test_cases: number
  execution_time: number | null
  memory_used: number | null
  submitted_at: string
  judged_at: string | null
}

export interface LeaderboardEntry {
  id: string
  rank: number
  name: string
  roll_number: string
  department: string
  total_score: number
  max_score: number
  solved_count: number
  total_problems: number
  attempts: number
  last_submission_time: string | null
}

export interface RunCodeResponse {
  stdout: string
  stderr: string
  runtime_ms: number
  memory_mb: number
  status: string
}

export interface SubmitCodeResponse {
  verdict: string
  passed_test_cases: number
  total_test_cases: number
  failed_test_case: {
    input: string
    expected_output: string
    actual_output: string
    test_order: number
  } | null
  execution_time: number
  memory_used: number
}
