import { deleteEventFromExcel, saveEventToExcel } from '@/app/actions/excel'
import type { CustomEventRecurrence } from '@/utils/eventHelpers'
import { checkTextLength, MAX_NAME, MAX_NOTE } from '@/utils/limits'
import { unwrapWriteResult } from '@/utils/writeErrors'

export interface CustomEventPayload {
  name: string
  event_date: string
  location: string | null
  content: string | null
  recurrence?: CustomEventRecurrence
}

export async function saveCustomEvent(
  payload: CustomEventPayload,
  eventId?: string
): Promise<void> {
  checkTextLength('eventName', payload.name, MAX_NAME)
  checkTextLength('location', payload.location, MAX_NOTE)
  checkTextLength('details', payload.content, MAX_NOTE)
  return unwrapWriteResult(await saveEventToExcel(payload, eventId))
}

export async function deleteCustomEvent(eventId: string): Promise<void> {
  return unwrapWriteResult(await deleteEventFromExcel(eventId))
}
