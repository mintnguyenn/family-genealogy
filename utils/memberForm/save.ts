import { saveMemberToExcel } from '@/app/actions/excel'
import { unwrapWriteResult } from '@/utils/writeErrors'

import type { SaveMemberOptions, SaveMemberResult } from './types'

export async function saveMember(
  options: SaveMemberOptions
): Promise<SaveMemberResult> {
  return unwrapWriteResult(await saveMemberToExcel(options))
}
