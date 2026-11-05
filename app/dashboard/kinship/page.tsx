import { Suspense } from 'react'

import KinshipFinder from '@/components/KinshipFinder'
import { getPersons, getRelationships } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('kinshipPageTitle') }
}

export default async function KinshipPage() {
  const { t } = await getServerTranslations()

  const [persons, relationships] = await Promise.all([
    getPersons(),
    getRelationships()
  ])

  return (
    <div className='relative flex w-full flex-1 flex-col pb-12'>
      <div className='relative z-20 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8'>
        <h1 className='title'>{t('kinshipPageTitle')}</h1>
        <p className='mt-1 text-sm text-stone-500'>
          {t('kinshipPageDescription')}
        </p>
      </div>

      <main className='mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 lg:px-8'>
        <Suspense fallback={null}>
          <KinshipFinder
            persons={persons ?? []}
            relationships={relationships ?? []}
          />
        </Suspense>
      </main>
    </div>
  )
}
