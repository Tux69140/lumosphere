// src/layouts/AuthLayout.tsx
import { Outlet } from 'react-router'
import { Header } from '@/components/Header'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
