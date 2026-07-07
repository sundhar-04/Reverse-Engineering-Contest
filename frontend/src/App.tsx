import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'

import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import JoinContestPage from './pages/public/JoinContestPage'
import ContestDashboard from './pages/participant/ContestDashboard'
import IDEPage from './pages/participant/IDEPage'
import SubmissionsPage from './pages/participant/SubmissionsPage'
import LeaderboardPage from './pages/participant/LeaderboardPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminContests from './pages/admin/AdminContests'
import CreateContestPage from './pages/admin/CreateContestPage'
import ContestDetailPage from './pages/admin/ContestDetailPage'
import AdminParticipants from './pages/admin/AdminParticipants'
import AdminSubmissions from './pages/admin/AdminSubmissions'
import AdminLeaderboard from './pages/admin/AdminLeaderboard'

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      checkAuth()
    }
  }, [])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#2a2445', color: '#e5e7eb', border: '1px solid #3d365e' },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join" element={<JoinContestPage />} />
        <Route path="/contest/:contestId" element={<ContestDashboard />} />
        <Route path="/contest/:contestId/ide" element={<IDEPage />} />
        <Route path="/contest/:contestId/submissions" element={<SubmissionsPage />} />
        <Route path="/contest/:contestId/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/contests" element={<AdminContests />} />
        <Route path="/admin/contests/create" element={<CreateContestPage />} />
        <Route path="/admin/contests/:contestId" element={<ContestDetailPage />} />
        <Route path="/admin/contests/:contestId/participants" element={<AdminParticipants />} />
        <Route path="/admin/contests/:contestId/submissions" element={<AdminSubmissions />} />
        <Route path="/admin/contests/:contestId/leaderboard" element={<AdminLeaderboard />} />
      </Routes>
    </>
  )
}
