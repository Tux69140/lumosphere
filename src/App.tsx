// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { NotFoundPage } from '@/features/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<AccueilPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
