'use server'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'family-admin'
const SESSION_MAX_AGE = 60 * 60 * 24

function credentialToken(username: string, password: string) {
  return createHash('sha256').update(`${username}\0${password}`).digest('hex')
}

function adminToken() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return null
  return credentialToken(ADMIN_USERNAME, ADMIN_PASSWORD)
}

function signExpiry(expiresAt: string, token: string) {
  return createHmac('sha256', token).update(expiresAt).digest('hex')
}

export async function getAdminSession() {
  const token = adminToken()
  if (!token) return false
  const value = (await cookies()).get(COOKIE_NAME)?.value
  const match = value?.match(/^(\d{13})\.([a-f0-9]{64})$/)
  if (!match || Number(match[1]) <= Date.now()) return false

  return timingSafeEqual(
    Buffer.from(match[2]),
    Buffer.from(signExpiry(match[1], token))
  )
}

export async function login(username: string, password: string) {
  if (typeof username !== 'string' || typeof password !== 'string') return false
  const token = adminToken()
  if (!token) return false
  const value = credentialToken(username, password)
  if (!timingSafeEqual(Buffer.from(value), Buffer.from(token))) return false

  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, `${expiresAt}.${signExpiry(expiresAt, token)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE
  })
  return true
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
