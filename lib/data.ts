import type { GalleryItem, Person, Relationship } from '@/types'
import type { CustomEventRecord } from '@/utils/eventHelpers'

// No persistence backend has been selected yet. These functions are the data
// boundary for pages and forms; replace their implementations when adding one.
export async function getPersons(): Promise<Person[]> {
  return []
}

export async function getRelationships(): Promise<Relationship[]> {
  return []
}

export async function getCustomEvents(): Promise<CustomEventRecord[]> {
  return []
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  return []
}

export async function getPersonById(id: string): Promise<Person | null> {
  return (await getPersons()).find((person) => person.id === id) ?? null
}

export interface PrivateDetails extends Record<string, unknown> {
  person_id: string
  phone_number: string | null
  occupation: string | null
  current_residence: string | null
}

export async function getPrivateDetails(
  personId: string
): Promise<PrivateDetails | null> {
  void personId
  return null
}

export function databaseNotConfigured(): never {
  throw new Error('No database is connected. Changes cannot be saved.')
}
