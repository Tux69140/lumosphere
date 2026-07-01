// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { CorpusSearchProvider } from '@/features/corpus/CorpusSearchProvider'

export function MainLayout() {
  return (
    <CorpusSearchProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 lg:flex-row lg:p-6">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </CorpusSearchProvider>
  )
}
