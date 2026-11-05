import { beforeEach, describe, expect, mock, test } from 'bun:test'

import {
  getMessages,
  type TranslationKey,
  type TranslationValues
} from '@/lib/i18n/messages'

import {
  fakeSupabase,
  type FakeCall,
  type FakeResult
} from './testing/fakeSupabase'

// Member server actions in app/actions/member.ts with Supabase, translations
// and the Next.js helpers replaced. Only a local admin session may write;
// everyone else is refused before any query.
const vi = getMessages('vi')

const MEMBER_ID = '11111111-1111-4111-8111-111111111111'

let isAdmin = true
let respond: (call: FakeCall) => FakeResult = () => ({ data: [] })
let calls: FakeCall[] = []
const getSupabase = mock(async () => {
  const fake = fakeSupabase((call) => respond(call))
  calls = fake.calls
  return fake.client
})
const revalidatePath = mock((path: string) => {
  void path
})
const redirect = mock((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`)
})

mock.module('@/utils/supabase/queries', () => ({
  getIsAdmin: async () => isAdmin,
  getPersonById: async () => ({ person: null, error: null }),
  getSupabase
}))
mock.module('@/lib/i18n/server', () => ({
  getServerTranslations: async () => ({
    locale: 'vi',
    dictionary: vi,
    t: (key: TranslationKey, values?: TranslationValues) => {
      void values
      return vi[key]
    }
  })
}))
mock.module('next/cache', () => ({ revalidatePath }))
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({ ...navigation, redirect }))

const { deleteMemberProfile, updateDescendantGenerationsAction } =
  await import('@/app/actions/member')

beforeEach(() => {
  isAdmin = true
  respond = () => ({ data: [] })
  calls = []
  getSupabase.mockClear()
  revalidatePath.mockClear()
  redirect.mockClear()
})

const writers = {
  deleteMemberProfile: () => deleteMemberProfile(MEMBER_ID),
  updateDescendantGenerationsAction: () =>
    updateDescendantGenerationsAction(MEMBER_ID, 1)
}

describe('member write actions', () => {
  test.each(Object.entries(writers))(
    '%s refuses a signed-out visitor before the database',
    async (_name, run) => {
      isAdmin = false
      const result = (await run()) as { error?: string }
      expect(result.error).toBeDefined()
      expect(getSupabase).not.toHaveBeenCalled()
      expect(calls).toEqual([])
      expect(revalidatePath).not.toHaveBeenCalled()
      expect(redirect).not.toHaveBeenCalled()
    }
  )
})

describe('deleteMemberProfile', () => {
  test('refuses an id that is not a UUID', async () => {
    expect(await deleteMemberProfile('1; drop table persons')).toEqual({
      error: vi.invalidProfile
    })
    expect(calls).toEqual([])
  })

  test('reports a row that row-level security would not delete', async () => {
    respond = (call) =>
      call.table === 'relationships' || call.op === 'delete'
        ? { data: [] }
        : { data: { avatar_url: null } }
    expect(await deleteMemberProfile(MEMBER_ID)).toEqual({
      error: vi.memberDeleteAccessDenied
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  test('reports a failed delete', async () => {
    respond = (call) =>
      call.op === 'delete' ? { error: { message: 'boom' } } : { data: [] }
    const original = console.error
    console.error = () => {}
    try {
      expect(await deleteMemberProfile(MEMBER_ID)).toEqual({
        error: vi.memberDeleteError
      })
    } finally {
      console.error = original
    }
    expect(redirect).not.toHaveBeenCalled()
  })

  test('deletes the member and goes back to the list', async () => {
    respond = (call) =>
      call.op === 'delete' ? { data: [{ id: MEMBER_ID }] } : { data: [] }
    await expect(deleteMemberProfile(MEMBER_ID)).rejects.toThrow(
      'NEXT_REDIRECT /dashboard/members'
    )
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/members')
    // The foreign key cascades atomically; no separate relationship deletion.
    expect(calls.every((call) => call.table === 'persons')).toBe(true)
  })
})

describe('updateDescendantGenerationsAction', () => {
  test('refuses an id that is not a UUID', async () => {
    expect(await updateDescendantGenerationsAction('x', 1)).toEqual({
      error: vi.invalidProfile
    })
  })

  test.each([1.5, 101, -101, Number.NaN])(
    'refuses a delta of %s',
    async (delta) => {
      expect(await updateDescendantGenerationsAction(MEMBER_ID, delta)).toEqual(
        { error: vi.invalidGenerationDelta }
      )
      expect(calls).toEqual([])
    }
  )

  test('a delta of 0 changes nothing', async () => {
    expect(await updateDescendantGenerationsAction(MEMBER_ID, 0)).toEqual({
      success: true
    })
    expect(calls).toEqual([])
  })

  test('reports a failed relationship load and writes nothing', async () => {
    const original = console.error
    console.error = () => {}
    respond = () => ({ error: { message: 'down' } })
    try {
      expect(await updateDescendantGenerationsAction(MEMBER_ID, 1)).toEqual({
        error: vi.relationshipsFetchError
      })
    } finally {
      console.error = original
    }
    expect(calls.some((c) => c.op === 'update' || c.op === 'rpc')).toBe(false)
  })
})
