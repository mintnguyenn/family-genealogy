'use server'

import { cache } from 'react'

import { getIsAdmin } from '@/lib/auth'
import { readFamilyWorkbook } from '@/lib/excel'
import type { GalleryItem, Person, Relationship } from '@/types'
import type { CustomEventRecord } from '@/utils/eventHelpers'

// Share one workbook snapshot within each server request. A new request reads
// the file again, so saving it in Excel and reloading the page shows changes.
const getFamilyData = cache(readFamilyWorkbook)

export async function getPersons(): Promise<Person[]> {
  return (await getFamilyData()).persons
}

export async function getRelationships(): Promise<Relationship[]> {
  return (await getFamilyData()).relationships
}

export async function getCustomEvents(): Promise<CustomEventRecord[]> {
  return (await getFamilyData()).custom_events
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const data = await getFamilyData()
  const tags = new Map<string, string[]>()
  for (const tag of data.gallery_item_persons) {
    const ids = tags.get(tag.gallery_item_id) ?? []
    ids.push(tag.person_id)
    tags.set(tag.gallery_item_id, ids)
  }
  return data.gallery.map((item) => ({
    ...item,
    person_ids: tags.get(item.id) ?? []
  }))
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
  if (!(await getIsAdmin())) return null
  return (
    (await getFamilyData()).person_details_private.find(
      (row) => row.person_id === personId
    ) ?? null
  )
}
