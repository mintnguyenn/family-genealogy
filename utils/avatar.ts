/** Local image paths; no remote storage or expiring URLs. */
export function getAvatarUrl(value: string | null | undefined) {
  const path = value?.trim()
  if (
    !path ||
    path.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(path) ||
    path.includes('..') ||
    path.includes('\\')
  )
    return null
  return path.startsWith('/') ? path : '/uploads/avatars/' + path
}
