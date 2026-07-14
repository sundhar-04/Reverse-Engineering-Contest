import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/admin/login', { username, password }),
  register: (data: { username: string; email: string; password: string; role: string }) =>
    api.post('/auth/admin/register', data),
  me: () => api.get('/auth/admin/me'),
}

// Contests
export const contestAPI = {
  list: (status?: string) => api.get('/contests', { params: { status } }),
  get: (id: string) => api.get(`/contests/${id}`),
  create: (data: any) => api.post('/contests', data),
  update: (id: string, data: any) => api.put(`/contests/${id}`, data),
  delete: (id: string) => api.delete(`/contests/${id}`),
  start: (id: string) => api.post(`/contests/${id}/start`),
  end: (id: string) => api.post(`/contests/${id}/end`),
  status: (id: string) => api.get(`/contests/${id}/status`),
  participants: (id: string) => api.get(`/contests/${id}/participants`),
  submissions: (id: string, verdict?: string) =>
    api.get(`/contests/${id}/submissions`, { params: { verdict } }),
  getActive: () => api.get('/contests/public/active'),
}

// Participants
export const participantAPI = {
  join: (data: { contest_id: string; name: string; roll_number: string; department: string }) =>
    api.post('/participants/join', data),
  get: (id: string) => api.get(`/participants/${id}`),
  getByRoll: (contestId: string, rollNumber: string) =>
    api.get(`/participants/contest/${contestId}/me`, { params: { roll_number: rollNumber } }),
}

// Problems
export const problemAPI = {
  list: (contestId: string) => api.get(`/problems/contest/${contestId}`),
  get: (id: string) => api.get(`/problems/${id}`),
  create: (data: { contest_id: string; title: string; description?: string; score?: number; time_limit?: number; memory_limit?: number }) =>
    api.post('/problems', data),
  update: (id: string, data: { title?: string; description?: string; score?: number; time_limit?: number; memory_limit?: number }) =>
    api.put(`/problems/${id}`, data),
  delete: (id: string) => api.delete(`/problems/${id}`),
  uploadExecutable: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/problems/${id}/executable`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  downloadExecutable: (id: string) =>
    api.get(`/problems/${id}/executable/download`, { responseType: 'blob' }),
}

// Execution
export const executeAPI = {
  run: (data: { code: string; input: string; participant_id: string; problem_id: string }) =>
    api.post('/execute/run', data),
  submit: (data: { code: string; participant_id: string; problem_id: string }) =>
    api.post('/submissions/submit', data),
  submitQueue: (data: { code: string; participant_id: string; problem_id: string }) =>
    api.post('/submissions/submit-queue', data),
  getQueueStatus: (jobId: string) =>
    api.get(`/submissions/queue-status/${jobId}`),
}

// Submissions
export const submissionAPI = {
  listByParticipant: (participantId: string) =>
    api.get(`/submissions/participant/${participantId}`),
  get: (id: string) => api.get(`/submissions/${id}`),
}

// Leaderboard
export const leaderboardAPI = {
  get: (contestId: string) => api.get(`/leaderboard/contest/${contestId}`),
}

// Admin
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  listContests: () => api.get('/admin/contests'),
  getStats: (contestId: string) => api.get(`/admin/contests/${contestId}/stats`),
  getParticipants: (contestId: string) => api.get(`/admin/contests/${contestId}/participants`),
  getSubmissions: (contestId: string, limit?: number) =>
    api.get(`/admin/contests/${contestId}/submissions`, { params: { limit } }),
  getLeaderboard: (contestId: string) => api.get(`/admin/contests/${contestId}/leaderboard`),
}

// Test Cases
export const testcaseAPI = {
  list: (problemId: string, includeHidden?: boolean) =>
    api.get(`/testcases/problem/${problemId}`, { params: { include_hidden: includeHidden } }),
  create: (data: any) => api.post('/testcases', data),
  uploadBulk: (problemId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/testcases/bulk?problem_id=${problemId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (id: string) => api.delete(`/testcases/${id}`),
}
