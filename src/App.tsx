import { Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { RequireAuth } from '@/components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<AccueilPage />} />
        <Route
          path="admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
