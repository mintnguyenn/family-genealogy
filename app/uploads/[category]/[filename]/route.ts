import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { imageDirectory } from '@/lib/localImages'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; filename: string }> }
) {
  const { category, filename } = await params
  if (
    !['avatars', 'gallery'].includes(category) ||
    !/^[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(filename)
  )
    return new Response(null, { status: 404 })
  try {
    const bytes = await readFile(
      /* turbopackIgnore: true */ join(imageDirectory(), category, filename)
    )
    const extension = filename.split('.').pop()!
    return new Response(bytes, {
      headers: {
        'Content-Type':
          extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return new Response(null, { status: 404 })
    throw error
  }
}
