import { dirname, join } from 'node:path'

import { familyWorkbookPath } from '@/lib/excel'

export const galleryPdfUrl = '/api/gallery-pdf'

export function galleryPdfPath() {
  return join(
    dirname(familyWorkbookPath()),
    'SUOI_NGUON_YEU_THUONG_20200828.pdf'
  )
}
