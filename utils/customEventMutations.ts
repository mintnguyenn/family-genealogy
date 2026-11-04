import { databaseNotConfigured } from '@/lib/data'
import type { CustomEventRecurrence } from '@/utils/eventHelpers'
import { checkTextLength, MAX_NAME, MAX_NOTE } from '@/utils/limits'

export interface CustomEventPayload {
  name: string
  event_date: string
  location: string | null
  content: string | null
  recurrence?: CustomEventRecurrence
}

// Persistence is supplied by the future database backend.
export async function saveCustomEvent(
  payload: CustomEventPayload,
  eventId?: string
): Promise<void> {
  checkTextLength('eventName', payload.name, MAX_NAME)
  checkTextLength('location', payload.location, MAX_NOTE)
  checkTextLength('details', payload.content, MAX_NOTE)
  void eventId
  return databaseNotConfigured()
}

export async function deleteCustomEvent(eventId: string): Promise<void> {
  void eventId
  return databaseNotConfigured()
}
