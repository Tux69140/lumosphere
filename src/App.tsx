import { Navigate, Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { RequireRole } from '@/components/RequireRole'
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'
import { AtelierPage } from '@/features/atelier/AtelierPage'
import { LotDetailPage } from '@/features/atelier/LotDetailPage'
import { UsersPage } from '@/features/admin/UsersPage'
import { RolesAccessPage } from '@/features/admin/RolesAccessPage'
import { AuteursPage } from '@/features/admin/AuteursPage'
import { OeuvresPage } from '@/features/admin/OeuvresPage'
import { SourcesPage } from '@/features/admin/SourcesPage'
import { ThemesPage } from '@/features/admin/ThemesPage'
import { KeywordsPage } from '@/features/admin/KeywordsPage'
import { EtatsPage } from '@/features/admin/EtatsPage'
import { EmojisPage } from '@/features/admin/EmojisPage'
import { CitationsAdminPage } from '@/features/admin/CitationsAdminPage'
import { LiteLLMConfigPage } from '@/features/admin/LiteLLMConfigPage'
import { SettingsPage } from '@/features/admin/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<AccueilPage />} />
        <Route path="atelier" element={<RequireRole roles={[ROLE_ADMIN, ROLE_EDITEUR]} />}>
          <Route index element={<AtelierPage />} />
          <Route path="lot/:id" element={<LotDetailPage />} />
        </Route>
        <Route path="admin" element={<RequireRole roles={[ROLE_ADMIN]} />}>
          <Route index element={<Navigate to="/admin/utilisateurs" replace />} />
          <Route path="utilisateurs" element={<UsersPage />} />
          <Route path="roles" element={<RolesAccessPage />} />
          <Route path="auteurs" element={<AuteursPage />} />
          <Route path="oeuvres" element={<OeuvresPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="themes" element={<ThemesPage />} />
          <Route path="mots-cles" element={<KeywordsPage />} />
          <Route path="etats" element={<EtatsPage />} />
          <Route path="emojis" element={<EmojisPage />} />
          <Route path="citations" element={<CitationsAdminPage />} />
          <Route path="ia" element={<LiteLLMConfigPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
