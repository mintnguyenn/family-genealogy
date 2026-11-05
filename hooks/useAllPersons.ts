'use client'

import { useEffect, useState } from 'react'

import { getPersons } from '@/lib/data'
import type { Person } from '@/types'

export function useAllPersons() {
  const [state, setState] = useState<{
    persons: Person[]
    error: string | null
    loading: boolean
  }>({ persons: [], error: null, loading: true })
  useEffect(() => {
    let cancelled = false
    getPersons()
      .then((persons) => {
        if (!cancelled) setState({ persons, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            persons: [],
            error: error instanceof Error ? error.message : String(error),
            loading: false
          })
      })
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
