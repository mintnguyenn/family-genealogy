import GalleryClient from '@/components/GalleryClient'
import { getIsAdmin } from '@/lib/auth'
import { getPersons } from '@/lib/data'
import { getServerTranslations } from '@/lib/i18n/server'
import { loadGalleryPage, parseGalleryPage } from '@/utils/gallery'
import { parseGalleryMember, parseGalleryPhoto } from '@/utils/galleryTags'

export async function generateMetadata() {
  const { t } = await getServerTranslations()
  return { title: t('galleryTitle'), description: t('galleryDescription') }
}

export default async function GalleryPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string | string[]
    member?: string | string[]
    photo?: string | string[]
  }>
}) {
  const [isAdmin, params, persons] = await Promise.all([
    getIsAdmin(),
    searchParams,
    getPersons()
  ])
  const memberId = parseGalleryMember(params.member)
  const photoId = parseGalleryPhoto(params.photo)
  const gallery = await loadGalleryPage(parseGalleryPage(params.page), memberId)

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-8'>
      <GalleryClient
        {...gallery}
        isAdmin={isAdmin}
        persons={persons}
        memberId={memberId}
        photoId={photoId}
      />
    </main>
  )
}
