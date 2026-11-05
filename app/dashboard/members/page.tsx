import type { Metadata } from 'next'
import { Suspense } from 'react'

import MembersViews from '@/components/MembersViews'
import MemberDetailModal from '@/components/modal/MemberDetailModal'
import ViewToggle from '@/components/ViewToggle'
import { MemberListProvider } from '@/context/MemberListContext'
import { getIsAdmin } from '@/lib/auth'
import { getPersons, getRelationships } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import { pickDefaultRootId } from '@/utils/treeRoot'
import { parseViewMode } from '@/utils/viewMode'

interface PageProps {
  searchParams: Promise<{ view?: string; rootId?: string; avatar?: string }>
}
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations()

  return { title: t('familyTree') }
}

export default async function FamilyTreePage({ searchParams }: PageProps) {
  const { view, rootId, avatar } = await searchParams
  const initialView = view === undefined ? undefined : parseViewMode(view)
  const initialShowAvatar = avatar !== 'hide'

  const isAdmin = await getIsAdmin()
  const canEdit = isAdmin

  // If view is list, we only need persons, not relationships.
  // We fetch persons for all views to pass down as a prop if we want, or let components fetch.
  // Actually, to make transitions fast and avoid duplicate fetching across components,
  // we will fetch data here and pass it down as props.
  const [persons, relationships] = await Promise.all([
    getPersons(),
    getRelationships()
  ])

  // Prepare map and roots for tree views
  const personsMap = new Map()
  persons.forEach((p) => personsMap.set(p.id, p))

  let finalRootId = rootId

  // If no rootId is provided, open on the earliest ancestor
  if (!finalRootId || !personsMap.has(finalRootId)) {
    finalRootId = pickDefaultRootId(persons, relationships)
  }

  return (
    <Suspense fallback={null}>
      <MemberListProvider
        initialView={initialView}
        initialRootId={finalRootId}
        initialShowAvatar={initialShowAvatar}>
        <ViewToggle />
        <MembersViews
          persons={persons}
          relationships={relationships}
          canEdit={canEdit}
        />

        <MemberDetailModal />
      </MemberListProvider>
    </Suspense>
  )
}
