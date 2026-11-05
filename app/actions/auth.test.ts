import { afterEach, beforeEach, expect, mock, test } from 'bun:test'

const nextHeaders = await import('next/headers')
const jar = new Map<string, string>()
mock.module('next/headers', () => ({
  ...nextHeaders,
  cookies: async () => ({
    get: (name: string) => ({ value: jar.get(name) }),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name)
  })
}))
const { login, logout, getAdminSession } = await import('./auth')
const previousUsername = process.env.ADMIN_USERNAME
const previousPassword = process.env.ADMIN_PASSWORD

beforeEach(() => {
  jar.clear()
  process.env.ADMIN_USERNAME = 'fixture-user'
  process.env.ADMIN_PASSWORD = 'fixture-password-not-a-real-credential'
})
afterEach(() => {
  if (previousUsername === undefined) delete process.env.ADMIN_USERNAME
  else process.env.ADMIN_USERNAME = previousUsername
  if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = previousPassword
})

test('missing either configured credential disables login and old sessions', async () => {
  expect(
    await login(process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)
  ).toBe(true)
  delete process.env.ADMIN_PASSWORD
  expect(await login('fixture-user', 'anything')).toBe(false)
  expect(await getAdminSession()).toBe(false)
  process.env.ADMIN_PASSWORD = 'fixture-password-not-a-real-credential'
  delete process.env.ADMIN_USERNAME
  expect(await login('fixture-user', process.env.ADMIN_PASSWORD)).toBe(false)
  expect(await getAdminSession()).toBe(false)
})

test('configured credentials establish a session and logout clears it', async () => {
  expect(await login('fixture-user', 'wrong-password')).toBe(false)
  expect(await getAdminSession()).toBe(false)
  expect(
    await login(process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)
  ).toBe(true)
  expect(await getAdminSession()).toBe(true)
  await logout()
  expect(await getAdminSession()).toBe(false)
})

test('rejects modified and expired cookies', async () => {
  await login(process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)
  const valid = jar.get('family-admin')!
  jar.set(
    'family-admin',
    valid.slice(0, -1) + (valid.endsWith('0') ? '1' : '0')
  )
  expect(await getAdminSession()).toBe(false)
  jar.set('family-admin', '0000000000000.' + valid.split('.')[1])
  expect(await getAdminSession()).toBe(false)
})

test('changing credentials invalidates the previous session', async () => {
  await login(process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!)
  process.env.ADMIN_PASSWORD = 'another-fixture-password'
  expect(await getAdminSession()).toBe(false)
})
