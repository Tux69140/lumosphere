import { Navigate, Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { RequireAdmin } from '@/components/RequireAdmin'
import { UsersPage } from '@/features/admin/UsersPage'
import { RolesAccessPage } from '@/features/admin/RolesAccessPage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<AccueilPage />} />
        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<Navigate to="/admin/utilisateurs" replace />} />
          <Route path="utilisateurs" element={<UsersPage />} />
          <Route path="roles" element={<RolesAccessPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
