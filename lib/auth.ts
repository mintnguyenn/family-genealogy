import { cache } from 'react'

import { getAdminSession } from '@/app/actions/auth'

export const getIsAdmin = cache(getAdminSession)
