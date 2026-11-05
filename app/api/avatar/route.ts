import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAvatarStoragePath } from '@/utils/avatar'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestedPath = new URL(request.url).searchParams.get('path')
  const path = getAvatarStoragePath(requestedPath)

  if (!path || path.length > 512 || path.includes('..')) {
    return new NextResponse('Invalid avatar path', { status: 400 })
  }

  const supabase = createClient(await cookies())
  // Guest access is still governed by the avatars bucket's storage policies.
  const { data, error } = await supabase.storage.from('avatars').download(path)

  if (error || !data) return new NextResponse('Not found', { status: 404 })

  if (!data.type.startsWith('image/')) {
    return new NextResponse('Unsupported avatar type', { status: 415 })
  }

  return new NextResponse(data, {
    headers: {
      'Cache-Control': 'private, max-age=300',
      'Content-Type': data.type,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}
