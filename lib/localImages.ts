import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { familyWorkbookPath, readFamilyWorkbook } from '@/lib/excel'
import { validateImageFile } from '@/utils/imageUpload'

export function imageDirectory() {
  return join(dirname(familyWorkbookPath()), 'uploads')
}

export async function saveLocalImage(
  file: File,
  category: 'avatars' | 'gallery'
) {
  const validation = await validateImageFile(file)
  if (!validation.ok)
    throw new Error(
      validation.reason === 'too-large'
        ? 'Ảnh vượt quá giới hạn 10 MB.'
        : 'Định dạng ảnh không hợp lệ.'
    )
  const folder = join(imageDirectory(), category)
  await mkdir(/* turbopackIgnore: true */ folder, { recursive: true })
  const name = `${randomUUID()}.${validation.extension}`
  await writeFile(
    /* turbopackIgnore: true */ join(folder, name),
    Buffer.from(await file.arrayBuffer()),
    { flag: 'wx' }
  )
  return `/uploads/${category}/${name}`
}

export async function removeNewImage(path: string) {
  const match = path.match(
    /^\/uploads\/(avatars|gallery)\/([a-f0-9-]{36}\.(?:png|jpg|gif|webp))$/
  )
  if (!match) throw new Error('Invalid upload path')
  await unlink(
    /* turbopackIgnore: true */ join(imageDirectory(), match[1], match[2])
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}

export async function removeUnusedImage(path: string | null | undefined) {
  if (
    !path ||
    !/^\/uploads\/(avatars|gallery)\/[a-f0-9-]{36}\.(?:png|jpg|gif|webp)$/.test(
      path
    )
  )
    return false
  const data = await readFamilyWorkbook()
  if (
    data.persons.some((person) => person.avatar_url === path) ||
    data.gallery.some((item) => item.image_url === path)
  )
    return false
  await removeNewImage(path)
  return true
}
