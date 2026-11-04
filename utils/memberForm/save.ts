import { databaseNotConfigured } from '@/lib/data'

import type { SaveMemberOptions, SaveMemberResult } from './types'

export async function saveMember(
  options: SaveMemberOptions
): Promise<SaveMemberResult> {
  void options
  return databaseNotConfigured()
}
