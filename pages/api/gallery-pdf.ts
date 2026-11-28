import { open } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

import type { NextApiRequest, NextApiResponse } from 'next'

import { galleryPdfPath } from '@/lib/galleryPdf'

// Use the Node response to keep Content-Length for the browser's PDF viewer.
export const config = { api: { bodyParser: false, responseLimit: false } }

export default async function servePdf(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD')
    return response.status(405).end()
  }
  const file = await open(
    /* turbopackIgnore: true */ galleryPdfPath(),
    'r'
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  if (!file) return response.status(404).end()

  try {
    const info = await file.stat()
    if (!info.isFile() || info.size === 0) return response.status(404).end()
    const { size } = info
    response.setHeader('X-Frame-Options', 'SAMEORIGIN')
    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Cache-Control', 'private, no-store, no-transform')
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', 'inline; filename="gia-pha.pdf"')
    if (request.method === 'HEAD') {
      response.setHeader('Content-Length', size)
      return response.status(200).end()
    }

    let start = 0
    let end = size - 1
    // Native PDF viewers can request a single byte range at a time.
    const range = request.headers['if-range']
      ? null
      : /^bytes=(\d*)-(\d*)$/i.exec(request.headers.range ?? '')
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
      if (range[1] && range[2]) end = Math.min(end, Number(range[2]))
      if (start > end) {
        response.setHeader('Content-Range', `bytes */${size}`)
        return response.status(416).end()
      }
      response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
      response.status(206)
    }
    response.setHeader('Content-Length', end - start + 1)
    await pipeline(file.createReadStream({ start, end }), response).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error
      }
    )
  } finally {
    await file.close()
  }
}
