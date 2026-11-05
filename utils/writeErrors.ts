import {
  RelationshipValidationError,
  RelationshipWarningError,
  type RelationshipValidationCode,
  type RelationshipWarningCode
} from '@/utils/relationshipValidation'

export type WriteResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; kind?: string; detail?: string }

// Server actions return errors explicitly so production builds preserve the
// message and the existing form's conflict/warning handling.
export function unwrapWriteResult<T>(result: WriteResult<T>): T {
  if (result.ok) return result.value
  if (result.kind === 'PersonChangedError') throw new PersonChangedError()
  if (result.kind === 'PersonNotUpdatedError') throw new PersonNotUpdatedError()
  if (result.kind === 'GalleryItemNotUpdatedError')
    throw new GalleryItemNotUpdatedError()
  if (result.kind === 'RelationshipValidationError')
    throw new RelationshipValidationError(
      result.detail as RelationshipValidationCode
    )
  if (result.kind === 'RelationshipWarningError')
    throw new RelationshipWarningError(result.detail as RelationshipWarningCode)
  throw new Error(result.error)
}

/** An update changed no row: the person is gone or the user may no longer edit it. */
export class PersonNotUpdatedError extends Error {
  constructor() {
    super('Person not updated')
    this.name = 'PersonNotUpdatedError'
  }
}

/** An update of a gallery item changed no row. */
export class GalleryItemNotUpdatedError extends Error {
  constructor() {
    super('Gallery item not updated')
    this.name = 'GalleryItemNotUpdatedError'
  }
}

/**
 * A person was changed by someone else since the form loaded it: the
 * conditional update on `updated_at` matched no row although the person is
 * still readable. Nothing was written.
 */
export class PersonChangedError extends Error {
  constructor() {
    super('Person changed by someone else')
    this.name = 'PersonChangedError'
  }
}
