import GalleryClient from '@/components/GalleryClient'
import { getIsAdmin } from '@/lib/auth'
import { getServerTranslations } from '@/lib/i18n/server'
import { loadGalleryPage, parseGalleryPage } from '@/utils/gallery'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('galleryTitle'), description: t('galleryDescription') }
}
export default async function GalleryPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const [isAdmin, params] = await Promise.all([getIsAdmin(), searchParams])
  const gallery = await loadGalleryPage(parseGalleryPage(params.page))
  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      <GalleryClient {...gallery} isAdmin={isAdmin} />
    </main>
  )
}
