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
        <div className="flex flex-1 flex-col lg:flex-row">
          <Sidebar />
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </CorpusSearchProvider>
  )
}
