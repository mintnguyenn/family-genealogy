import { Suspense } from 'react'

import EventsList from '@/components/EventsList'
import MemberDetailModal from '@/components/modal/MemberDetailModal'
import { MemberListProvider } from '@/context/MemberListContext'
import { getIsAdmin } from '@/lib/auth'
import { getCustomEvents, getPersons } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('eventsTitle') }
}

export default async function EventsPage() {
  const [{ t }, isAdmin] = await Promise.all([
    getServerTranslations(),
    getIsAdmin()
  ])

  const [persons, customEvents] = await Promise.all([
    getPersons(),
    getCustomEvents()
  ])

  return (
    <Suspense fallback={null}>
      <MemberListProvider>
        <div className='relative flex w-full flex-1 flex-col pb-12'>
          <div className='relative z-20 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8'>
            <h1 className='title'>{t('eventsTitle')}</h1>
            <p className='mt-1 text-sm text-stone-500'>
              {t('eventsDescription')}
            </p>
          </div>

          <main className='mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 lg:px-8'>
            <EventsList
              persons={persons ?? []}
              customEvents={customEvents ?? []}
              isAdmin={Boolean(isAdmin)}
            />
          </main>
        </div>

        {/* Modal for member details when clicking an event card */}
        <MemberDetailModal />
      </MemberListProvider>
    </Suspense>
  )
}
