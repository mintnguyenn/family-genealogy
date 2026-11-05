import { Person } from '@/types'
import { findPossibleDuplicates } from '@/utils/duplicatePeople'
import { finishMemberSave } from '@/utils/memberForm/finish'
import { loadSavedRelatives } from '@/utils/memberForm/relatives'
import { saveMember } from '@/utils/memberForm/save'
import type { MemberFormSubmitContext } from '@/utils/memberForm/types'
import {
  findTooLongText,
  normalizeDeathDates,
  validateMemberForm
} from '@/utils/memberFormHelpers'
import { memberSearchCache } from '@/utils/memberSearchCache'
import {
  findBirthDateConflict,
  findParentDeathIssues,
  type ParentDeathFinding
} from '@/utils/relationshipValidation'
import { PersonChangedError, PersonNotUpdatedError } from '@/utils/writeErrors'

const MAX_LISTED_DUPLICATES = 5

const deathNames = (finding: ParentDeathFinding) => ({
  parent: finding.parent,
  child: finding.child
})

const toNullable = (value: number | '') => (value === '' ? null : value)

function birthDateChanged(ctx: MemberFormSubmitContext) {
  const before = ctx.initialData
  return (
    toNullable(ctx.birthYear) !== (before?.birth_year ?? null) ||
    toNullable(ctx.birthMonth) !== (before?.birth_month ?? null) ||
    toNullable(ctx.birthDay) !== (before?.birth_day ?? null)
  )
}

function deathOrGenderChanged(
  before: Person | undefined,
  after: {
    gender: string
    death_year: number | null
    death_month: number | null
    death_day: number | null
  }
) {
  return (
    (before?.gender != null && before.gender !== after.gender) ||
    after.death_year !== (before?.death_year ?? null) ||
    after.death_month !== (before?.death_month ?? null) ||
    after.death_day !== (before?.death_day ?? null)
  )
}

// Orchestrates validation + persistence + navigation for the member form.
// The component only wires state; every branch lives here so the React
// function stays simple.
export async function submitMemberForm(ctx: MemberFormSubmitContext) {
  const { t, setLoading, setError, setConfirmation } = ctx
  setLoading(true)
  setError(null)
  setConfirmation(null)
  ctx.setChanged?.(false)

  const normalized = normalizeDeathDates(
    ctx.isDeceased,
    ctx.death.currentValues
  )
  if (!normalized.ok) {
    setError(t(normalized.errorKey))
    setLoading(false)
    return
  }

  const validationError = validateMemberForm(
    ctx.birthDay,
    ctx.birthMonth,
    ctx.birthYear,
    ctx.isDeceased,
    normalized.values,
    ctx.fields.fullName,
    undefined,
    { birthOrder: ctx.fields.birthOrder, generation: ctx.fields.generation }
  )
  if (validationError) {
    setError(t(validationError))
    setLoading(false)
    return
  }

  const tooLong = findTooLongText({
    ...ctx.fields,
    ...ctx.privateFields,
    burialPlace: ctx.isDeceased ? ctx.fields.burialPlace : ''
  })
  if (tooLong) {
    setError(t('textTooLong', { field: t(tooLong.label), max: tooLong.max }))
    setLoading(false)
    return
  }

  try {
    const fullName = ctx.fields.fullName.trim()
    const warnings: string[] = []

    // A changed birth or death date must still fit the parents and children
    // (new members have no relatives yet).
    const personId = ctx.initialData?.id
    if (ctx.isEditing && personId) {
      const birthChanged = birthDateChanged(ctx)
      const person = {
        id: personId,
        full_name: fullName,
        gender: ctx.fields.gender,
        birth_year: toNullable(ctx.birthYear),
        birth_month: toNullable(ctx.birthMonth),
        birth_day: toNullable(ctx.birthDay),
        death_year: ctx.isDeceased ? toNullable(normalized.values.year) : null,
        death_month: ctx.isDeceased
          ? toNullable(normalized.values.month)
          : null,
        death_day: ctx.isDeceased ? toNullable(normalized.values.day) : null
      }
      if (
        (birthChanged && person.birth_year != null) ||
        deathOrGenderChanged(ctx.initialData, person)
      ) {
        const { parents, children } = await loadSavedRelatives(personId)
        const conflict = birthChanged
          ? findBirthDateConflict(person, parents, children)
          : null
        if (conflict) {
          setError(
            t(
              conflict.relation === 'parent'
                ? 'memberBornBeforeParent'
                : 'memberBornAfterChild',
              { name: conflict.name }
            )
          )
          return
        }

        const findings = findParentDeathIssues(person, parents, children)
        const mother = findings.find((f) => f.issue === 'motherDiedBeforeBirth')
        if (mother) {
          setError(t('memberMotherDiedBeforeBirth', deathNames(mother)))
          return
        }
        for (const finding of findings)
          warnings.push(
            t('memberFatherDiedLongBeforeBirth', deathNames(finding))
          )
      }
    } else {
      const duplicates = await findPossibleDuplicates(
        fullName,
        toNullable(ctx.birthYear)
      )
      if (duplicates.length > 0) {
        warnings.push(
          t('memberPossibleDuplicate', {
            count: duplicates.length,
            names: duplicates
              .slice(0, MAX_LISTED_DUPLICATES)
              .map((p) =>
                p.birth_year == null
                  ? p.full_name
                  : `${p.full_name} (${p.birth_year})`
              )
              .join(', ')
          })
        )
      }
    }

    if (warnings.length > 0 && !ctx.confirmed) {
      setConfirmation(warnings.join('\n'))
      return
    }

    const { personId: currentPersonId } = await saveMember({
      isEditing: ctx.isEditing,
      initialData: ctx.initialData,
      fields: ctx.fields,
      deathValues: normalized.values,
      avatarUrl: ctx.avatarUrl,
      avatarFile: ctx.avatarFile,
      removeExistingAvatar: ctx.removeExistingAvatar,
      privateLoaded: ctx.privateLoaded,
      privateFields: ctx.privateFields,
      updateDescendantGenerations: ctx.updateDescendantGenerations
    })

    memberSearchCache.clear()
    finishMemberSave(ctx, currentPersonId)
  } catch (err) {
    console.error('Error saving member:', err)
    if (err instanceof PersonChangedError) ctx.setChanged?.(true)
    setError(
      err instanceof PersonChangedError
        ? t('personChanged')
        : err instanceof PersonNotUpdatedError
          ? t('personNotUpdated')
          : (err as Error).message || t('saveMemberError')
    )
  } finally {
    setLoading(false)
  }
}
