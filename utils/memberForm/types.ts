import type { TranslationKey, TranslationValues } from '@/lib/i18n/messages'
import { Person } from '@/types'
import { DeathDateValues, MemberFormFields } from '@/utils/memberFormHelpers'

export interface SaveMemberOptions {
  isEditing: boolean
  initialData?: Person
  fields: MemberFormFields
  /** Normalized death-date values after solar/lunar reconciliation. */
  deathValues: {
    day: number | ''
    month: number | ''
    year: number | ''
    lunarDay: number | ''
    lunarMonth: number | ''
    lunarYear: number | ''
  }
  /** Avatar path scratch value maintained by the form (submit-only data). */
  avatarUrl: string
  avatarFile: File | null
  removeExistingAvatar: boolean
  /**
   * False when the private details could not be read for this form: they are
   * then left exactly as stored (no upsert, and above all no delete).
   * Defaults to true.
   */
  privateLoaded?: boolean
  privateFields: {
    phoneNumber: string
    occupation: string
    currentResidence: string
  }
  updateDescendantGenerations: boolean
}

export interface SaveMemberResult {
  personId: string
}

export interface MemberFormSubmitContext {
  router: { push: (url: string) => void; refresh: () => void }
  t: (key: TranslationKey, values?: TranslationValues) => string
  isEditing: boolean
  initialData?: Person
  fields: MemberFormFields
  death: {
    currentValues: DeathDateValues
    deathYear: number | ''
    deathMonth: number | ''
    deathDay: number | ''
    deathLunarYear: number | ''
    deathLunarMonth: number | ''
    deathLunarDay: number | ''
  }
  birthYear: number | ''
  birthMonth: number | ''
  birthDay: number | ''
  isDeceased: boolean
  isInLaw: boolean
  birthOrder: number | ''
  generation: number | ''
  otherNames: string
  note: string
  avatarUrl: string
  avatarFile: File | null
  removeExistingAvatar: boolean
  privateLoaded?: boolean
  privateFields: {
    phoneNumber: string
    occupation: string
    currentResidence: string
  }
  updateDescendantGenerations: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  /**
   * Asks before saving something that only looks wrong (a possible duplicate,
   * a father who died long before a birth). The form repeats the submit with
   * `confirmed` set when the user continues.
   */
  setConfirmation: (value: string | null) => void
  /** The user accepted the confirmation: skip the checks that ask. */
  confirmed?: boolean
  onSuccess?: (personId: string) => void
  /**
   * The person was changed by someone else since the form loaded: the form
   * offers a reload (nothing was saved).
   */
  setChanged?: (value: boolean) => void
}
